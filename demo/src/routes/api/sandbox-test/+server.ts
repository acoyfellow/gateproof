import { getSandbox } from "@cloudflare/sandbox";
import type { RequestEvent } from "@sveltejs/kit";

// Simple endpoint that mimics the official baseline example exactly
export const GET = async ({ platform }: RequestEvent) => {
  try {
    const env = platform?.env as { Sandbox?: any } | undefined;

    if (!env?.Sandbox) {
      return Response.json({ error: "Sandbox binding not available" }, { status: 500 });
    }

    // Use static ID exactly like the baseline
    const sandbox = getSandbox(env.Sandbox, "my-sandbox");

    // Simple exec exactly like the baseline
    const result = await sandbox.exec('echo "2 + 2 = $((2 + 2))"');

    return Response.json({
      output: result.stdout,
      error: result.stderr,
      exitCode: result.exitCode,
      success: result.success
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return Response.json({
      error: message,
      stack,
      name: error instanceof Error ? error.name : undefined
    }, { status: 500 });
  }
};
