import type { RequestEvent } from "@sveltejs/kit";
import { ensureSandboxReady, getSandboxSafely, summarizeSandboxError, withSandboxRetry } from "$lib/sandbox";

type Env = {
  Sandbox?: any;
  DEV?: boolean;
};

type RunRequest = {
  prdFile: string;
  apiUrl?: string;
  testUrl?: string;
};

export const POST = async ({ request, platform }: RequestEvent) => {
  try {
    const env = platform?.env as { Sandbox?: any; DEV?: boolean } | undefined;
    if (!env?.DEV && !env?.Sandbox) {
      return new Response(
        JSON.stringify({ 
          message: "Sandbox bindings not configured" 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let getSandbox: typeof import("@cloudflare/sandbox").getSandbox;
    let parseSSEStream: typeof import("@cloudflare/sandbox").parseSSEStream;
    try {
      ({ getSandbox, parseSSEStream } = await import("@cloudflare/sandbox"));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({ message: "Sandbox runtime unavailable", detail: message }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const requestId = request.headers.get("cf-ray") ?? request.headers.get("x-request-id") ?? undefined;

    let body: RunRequest;
    try {
      body = (await request.json()) as RunRequest;
    } catch {
      return new Response(
        JSON.stringify({ message: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!body?.prdFile) {
      return new Response(
        JSON.stringify({ message: "Missing prdFile" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const sandboxId = crypto.randomUUID();
    let sandbox: Awaited<ReturnType<typeof getSandboxSafely>>;
    try {
      sandbox = await getSandboxSafely(env, sandboxId, {
        containerTimeouts: {
          instanceGetTimeoutMS: 60000,
          portReadyTimeoutMS: 180000,
        },
      });
    } catch (error) {
      const debug = summarizeSandboxError(error);
      return new Response(
        JSON.stringify({ message: "Sandbox unavailable", detail: debug.message, debug }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
    try {
      try {
        await ensureSandboxReady(sandbox);
      } catch {
        // sandbox may not be fully ready yet, continue to mkdir
      }
      await withSandboxRetry(
        () => sandbox.mkdir("/workspace", { recursive: true }),
        {
          retries: 20,
          baseDelayMs: 1000,
          maxDelayMs: 5000,
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({ 
          message: "Sandbox mkdir failed - container may not be provisioned", 
          detail: message,
          debug: { sandboxId, requestId, step: "mkdir" }
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      await withSandboxRetry(
        () => sandbox.writeFile("/workspace/prd.ts", body.prdFile),
      );
    } catch (error) {
      const debug = summarizeSandboxError(error);
      return new Response(
        JSON.stringify({ message: "Sandbox error: writeFile", detail: debug.message, debug }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiUrl = body.apiUrl ?? "https://your-api.com";
    const testUrl = body.testUrl ?? "http://localhost:3000";
    const command = "./node_modules/.bin/tsx prd.ts";

    let process: Awaited<ReturnType<typeof sandbox.startProcess>>;
    try {
      process = await withSandboxRetry(
        () =>
          sandbox.startProcess(`cd /workspace && ${command}`, {
            env: {
              API_URL: apiUrl,
              TEST_URL: testUrl,
            },
          }),
      );
    } catch (error) {
      const debug = summarizeSandboxError(error);
      return new Response(
        JSON.stringify({ message: "Sandbox error: startProcess", detail: debug.message, debug }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let logStream: Awaited<ReturnType<typeof sandbox.streamProcessLogs>>;
    try {
      logStream = await withSandboxRetry(
        () => sandbox.streamProcessLogs(process.id),
      );
    } catch (error) {
      const debug = summarizeSandboxError(error);
      return new Response(
        JSON.stringify({ message: "Sandbox error: streamProcessLogs", detail: debug.message, debug }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const writeEvent = async (event: string, data: unknown) => {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(payload));
    };

    let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
    const startKeepAlive = () => {
      keepAliveTimer = setInterval(() => {
        writeEvent("ping", { timestamp: new Date().toISOString() }).catch(() => {
          if (keepAliveTimer) clearInterval(keepAliveTimer);
        });
      }, 25000);
    };

    const runLogs = (async () => {
      await writeEvent("meta", { sandboxId, processId: process.id });
      for await (const event of parseSSEStream<{ data: string; timestamp?: string }>(logStream)) {
        await writeEvent("stdout", { data: event.data, timestamp: event.timestamp });
      }
    })();

    const monitor = (async () => {
      const deadline = Date.now() + 180_000;
      while (Date.now() < deadline) {
        let status: string;
        try {
          status = await process.getStatus();
        } catch (error) {
          await writeEvent("error", { error: summarizeSandboxError(error).message });
          return;
        }
        if (status !== "running" && status !== "starting") {
          await writeEvent("complete", { status, exitCode: process.exitCode ?? null });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      await sandbox.killProcess(process.id).catch(() => {});
      await writeEvent("error", { error: "Sandbox execution timed out" });
    })();

    startKeepAlive();
    Promise.all([runLogs, monitor])
      .catch(async (error) => {
        await writeEvent("error", { error: error instanceof Error ? error.message : String(error) });
      })
      .finally(async () => {
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        await writer.close();
      });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("PRD run error:", error);
    return new Response(
      JSON.stringify({ message: "Internal Error", detail: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
