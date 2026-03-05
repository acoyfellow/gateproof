import type { RequestEvent } from "@sveltejs/kit";
import { getSandbox, parseSSEStream } from "@cloudflare/sandbox";

type SandboxBinding = Parameters<typeof getSandbox>[0];
type SandboxEnvironment = { Sandbox?: SandboxBinding };

type RunRequest = {
  prdFile: string;
  apiUrl?: string;
  testUrl?: string;
};

export const POST = async ({ request, platform }: RequestEvent) => {
  try {
    const env = platform?.env as SandboxEnvironment | undefined;
    if (!env?.Sandbox) {
      return Response.json({ message: "Sandbox bindings not configured" }, { status: 500 });
    }

    let body: RunRequest;
    try {
      body = (await request.json()) as RunRequest;
    } catch {
      return Response.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    if (!body?.prdFile) {
      return Response.json({ message: "Missing prdFile" }, { status: 400 });
    }

    const sandbox = getSandbox(env.Sandbox, "plan-sandbox");

    await sandbox.writeFile("/workspace/plan.ts", body.prdFile);

    const apiUrl = body.apiUrl ?? "https://your-api.com";
    const testUrl = body.testUrl ?? "http://localhost:3000";

    const process = await sandbox.startProcess("cd /workspace && ./node_modules/.bin/tsx plan.ts", {
      env: { API_URL: apiUrl, TEST_URL: testUrl },
    });

    const logStream = await sandbox.streamProcessLogs(process.id);

    // Stream the output
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const writeEvent = async (event: string, data: unknown) => {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    };

    const runLogs = (async () => {
      await writeEvent("meta", { sandboxId: "plan-sandbox", processId: process.id });
      for await (const event of parseSSEStream<{ data: string; timestamp?: string }>(logStream)) {
        await writeEvent("stdout", { data: event.data, timestamp: event.timestamp });
      }
    })();

    const monitor = (async () => {
      const deadline = Date.now() + 180_000;
      while (Date.now() < deadline) {
        const status = await process.getStatus();
        if (status !== "running" && status !== "starting") {
          await writeEvent("complete", { status, exitCode: process.exitCode ?? null });
          return;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      await sandbox.killProcess(process.id).catch(() => {});
      await writeEvent("error", { error: "Sandbox execution timed out" });
    })();

    Promise.all([runLogs, monitor])
      .catch(async (error) => {
        await writeEvent("error", { error: error instanceof Error ? error.message : String(error) });
      })
      .finally(() => writer.close());

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ message: "Internal Error", detail: message }, { status: 500 });
  }
};
