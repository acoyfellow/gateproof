import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const EXAMPLE_URL = "http://127.0.0.1:3210/";

function spawnBun(args: ReadonlyArray<string>) {
  return spawn("bun", args, {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

async function waitForServer(url: string, attempts = 20): Promise<void> {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the local server is reachable.
    }

    await delay(100);
  }

  throw new Error(`hello-world server did not become reachable at ${url}`);
}

function waitForExit(child: ReturnType<typeof spawnBun>): Promise<number | null> {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code));
  });
}

const server = spawnBun(["run", "examples/hello-world/server.ts"]);

try {
  await waitForServer(EXAMPLE_URL);

  const proof = spawnBun(["run", "examples/hello-world/plan.ts"]);
  const exitCode = await waitForExit(proof);

  if (exitCode !== 0) {
    process.exitCode = exitCode ?? 1;
  }
} finally {
  server.kill("SIGTERM");
  await waitForExit(server).catch(() => undefined);
}
