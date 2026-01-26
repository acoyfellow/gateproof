import type { RequestEvent } from "@sveltejs/kit";

type Env = {
  Sandbox: DurableObjectNamespace<unknown>;
};

type StopRequest = {
  sandboxId: string;
  processId: string;
};

export const POST = async ({ request, platform }: RequestEvent) => {
  const env = platform?.env as Env | undefined;
  if (!env?.Sandbox) {
    return new Response("Sandbox binding not configured", { status: 500 });
  }

  let getSandbox: typeof import("@cloudflare/sandbox").getSandbox;
  try {
    ({ getSandbox } = await import("@cloudflare/sandbox"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`Sandbox runtime unavailable: ${message}`, { status: 503 });
  }

  const body = (await request.json()) as StopRequest;
  if (!body?.sandboxId || !body?.processId) {
    return new Response("Missing sandboxId or processId", { status: 400 });
  }

  const sandbox = getSandbox(env.Sandbox, body.sandboxId);
  await sandbox.killProcess(body.processId);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
