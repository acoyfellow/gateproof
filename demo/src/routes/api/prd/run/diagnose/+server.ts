import type { RequestEvent } from "@sveltejs/kit";
import { ensureSandboxReady, getSandboxSafely, summarizeSandboxError, withSandboxRetry } from "$lib/sandbox";

type Env = {
  Sandbox: DurableObjectNamespace<unknown>;
};

type Step = "import" | "mkdir" | "write" | "start" | "logs" | "complete";

type DiagnoseResult = {
  ok: boolean;
  step: Step;
  sandboxId?: string;
  requestId?: string;
  detail?: string;
  debug?: {
    error: string;
    stack?: string;
  };
};

const prdFile = `console.log("sandbox ok");\nprocess.exit(0);\n`;

export const POST = async ({ platform, request }: RequestEvent) => {
  const requestId = request.headers.get("cf-ray") ?? request.headers.get("x-request-id") ?? undefined;
  const env = platform?.env as Env | undefined;
  if (!env?.Sandbox) {
    return new Response(JSON.stringify({ ok: false, step: "import", requestId, detail: "Sandbox binding not configured" } satisfies DiagnoseResult), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let getSandbox: typeof import("@cloudflare/sandbox").getSandbox;
  try {
    ({ getSandbox } = await import("@cloudflare/sandbox"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ ok: false, step: "import", requestId, detail: message } satisfies DiagnoseResult), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
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
    return new Response(JSON.stringify({ ok: false, step: "import", sandboxId, requestId, detail: debug.message, debug } satisfies DiagnoseResult), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
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
    const debug = summarizeSandboxError(error);
    return new Response(JSON.stringify({ 
      ok: false, 
      step: "mkdir", 
      sandboxId, 
      requestId, 
      detail: `Container provisioning issue: ${debug.message}`,
      debug: { error: debug.message, stack: debug.stack }
    } satisfies DiagnoseResult), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await withSandboxRetry(
      () => sandbox.writeFile("/workspace/prd.ts", prdFile),
    );
  } catch (error) {
    const debug = summarizeSandboxError(error);
    return new Response(JSON.stringify({ ok: false, step: "write", sandboxId, requestId, detail: debug.message, debug } satisfies DiagnoseResult), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const proc = await withSandboxRetry(
      () => sandbox.startProcess("cd /workspace && ./node_modules/.bin/tsx prd.ts"),
    );
    await sandbox.streamProcessLogs(proc.id);
  } catch (error) {
    const debug = summarizeSandboxError(error);
    return new Response(JSON.stringify({ ok: false, step: "start", sandboxId, requestId, detail: debug.message, debug } satisfies DiagnoseResult), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, step: "complete", sandboxId, requestId } satisfies DiagnoseResult), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
