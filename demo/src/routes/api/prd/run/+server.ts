import type { RequestEvent } from "@sveltejs/kit";

type Env = {
  Sandbox: DurableObjectNamespace<unknown>;
};

type RunRequest = {
  prdFile: string;
  apiUrl?: string;
  testUrl?: string;
};

export const POST = async ({ request, platform }: RequestEvent) => {
  const env = platform?.env as Env | undefined;
  if (!env?.Sandbox) {
    return new Response("Sandbox binding not configured", { status: 500 });
  }

  let getSandbox: typeof import("@cloudflare/sandbox").getSandbox;
  let parseSSEStream: typeof import("@cloudflare/sandbox").parseSSEStream;
  try {
    ({ getSandbox, parseSSEStream } = await import("@cloudflare/sandbox"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`Sandbox runtime unavailable: ${message}`, { status: 503 });
  }

  const body = (await request.json()) as RunRequest;
  if (!body?.prdFile) {
    return new Response("Missing prdFile", { status: 400 });
  }

  const sandboxId = crypto.randomUUID();
  const sandbox = getSandbox(env.Sandbox, sandboxId);
  await sandbox.mkdir("/workspace", { recursive: true });
  await sandbox.writeFile("/workspace/prd.ts", body.prdFile);

  const apiUrl = body.apiUrl ?? "https://your-api.com";
  const testUrl = body.testUrl ?? "http://localhost:3000";
  const command = "./node_modules/.bin/tsx prd.ts";

  const process = await sandbox.startProcess(`cd /workspace && ${command}`, {
    env: {
      API_URL: apiUrl,
      TEST_URL: testUrl,
    },
  });

  const logStream = await sandbox.streamProcessLogs(process.id);
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const writeEvent = async (event: string, data: unknown) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(payload));
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
      const status = await process.getStatus();
      if (status.status !== "running") {
        await writeEvent("complete", { status: status.status, exitCode: status.exitCode ?? null });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    await sandbox.killProcess(process.id);
    await writeEvent("error", { error: "Sandbox execution timed out" });
  })();

  Promise.all([runLogs, monitor])
    .catch(async (error) => {
      await writeEvent("error", { error: error instanceof Error ? error.message : String(error) });
    })
    .finally(async () => {
      await writer.close();
    });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
};
