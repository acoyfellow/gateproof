import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { Effect } from "effect";
import type { ScopeFile } from "../src/index";

type RuntimeModule = typeof import("../src/index");
type HelloWorldPlanModule = {
  default: ScopeFile;
};
type HelloWorldServerModule = {
  startHelloWorldServer: (port?: number) => ReturnType<typeof Bun.serve>;
};

interface CommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

interface HelloWorldWorkerLoopSmokeResult {
  status: string;
  commits: number;
  finalBody: string;
}

const repoRoot = resolve(import.meta.dir, "..");
const tempRootBase = resolve(repoRoot, ".tmp");
const exampleRoot = resolve(repoRoot, "examples", "hello-world");
const sourceRoot = resolve(repoRoot, "src");

const nextPort = (base: number): number => base + Math.floor(Math.random() * 1000);

const runCommand = (cwd: string, command: string, args: ReadonlyArray<string>): Promise<CommandResult> =>
  new Promise((resolveCommand, reject) => {
    const child = spawn(command, [...args], {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.once("error", reject);
    child.once("close", (code) => {
      resolveCommand({
        ok: code === 0,
        stdout,
        stderr,
      });
    });
  });

const runChecked = async (cwd: string, command: string, args: ReadonlyArray<string>): Promise<CommandResult> => {
  const result = await runCommand(cwd, command, args);
  if (!result.ok) {
    throw new Error(
      [
        `command failed: ${command} ${args.join(" ")}`,
        result.stdout.trim(),
        result.stderr.trim(),
      ].filter(Boolean).join("\n"),
    );
  }
  return result;
};

const waitForServer = async (url: string, attempts = 40): Promise<void> => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the server is reachable.
    }

    await delay(50);
  }

  throw new Error(`hello-world server did not become reachable at ${url}`);
};

export const runHelloWorldWorkerLoopSmoke = async (): Promise<HelloWorldWorkerLoopSmokeResult> => {
  await mkdir(tempRootBase, { recursive: true });
  const tempRoot = await mkdtemp(resolve(tempRootBase, "hello-world-worker-"));
  const tempExampleRoot = resolve(tempRoot, "examples", "hello-world");
  const responsePath = resolve(tempExampleRoot, "response.txt");
  const helloWorldPort = nextPort(33_000);
  const modelPort = nextPort(43_000);
  const previousPort = process.env.HELLO_WORLD_PORT;
  let helloWorldServer: ReturnType<typeof Bun.serve> | undefined;
  let modelServer: ReturnType<typeof Bun.serve> | undefined;

  try {
    await cp(exampleRoot, tempExampleRoot, { recursive: true });
    await cp(sourceRoot, resolve(tempRoot, "src"), { recursive: true });

    await runChecked(tempRoot, "git", ["init"]);
    await runChecked(tempRoot, "git", ["branch", "-M", "main"]);
    await runChecked(tempRoot, "git", ["config", "user.name", "Gateproof Smoke"]);
    await runChecked(tempRoot, "git", ["config", "user.email", "smoke@gateproof.local"]);
    await runChecked(tempRoot, "git", ["add", "-A"]);
    await runChecked(tempRoot, "git", ["commit", "-m", "chore: hello world baseline"]);

    await writeFile(responsePath, "not ready\n", "utf8");

    const instructions = [
      {
        action: "read",
        path: "examples/hello-world/response.txt",
      },
      {
        action: "write",
        path: "examples/hello-world/response.txt",
        content: "hello world\n",
      },
      {
        action: "done",
        summary: "restored hello world",
        commitMessage: "fix: restore hello world response",
      },
    ];
    let instructionIndex = 0;

    modelServer = Bun.serve({
      port: modelPort,
      hostname: "127.0.0.1",
      fetch() {
        const instruction = instructions[Math.min(instructionIndex, instructions.length - 1)];
        instructionIndex += 1;

        return Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify(instruction),
              },
            },
          ],
        });
      },
    });

    process.env.HELLO_WORLD_PORT = String(helloWorldPort);

    const runtime = (await import(
      pathToFileURL(resolve(tempRoot, "src", "index.ts")).href
    )) as RuntimeModule;
    const planModule = (await import(
      pathToFileURL(resolve(tempRoot, "examples", "hello-world", "plan.ts")).href
    )) as HelloWorldPlanModule;
    const serverModule = (await import(
      pathToFileURL(resolve(tempRoot, "examples", "hello-world", "server.ts")).href
    )) as HelloWorldServerModule;
    const workerScope: ScopeFile = {
      ...planModule.default,
      plan: runtime.Plan.define({
        ...planModule.default.plan,
        goals: planModule.default.plan.goals.map((goal, index) =>
          index === 0
            ? {
              ...goal,
              scope: {
                allowedPaths: ["examples/hello-world/"],
                maxChangedFiles: 1,
                maxChangedLines: 5,
              },
            }
            : goal),
      }),
    };

    helloWorldServer = serverModule.startHelloWorldServer(helloWorldPort);
    await waitForServer(`http://127.0.0.1:${helloWorldPort}/`);

    const result = await Effect.runPromise(runtime.Plan.runLoop(workerScope.plan, {
      maxIterations: 3,
      worker: runtime.createOpenCodeWorker({
        endpoint: `http://127.0.0.1:${modelPort}/`,
        timeoutMs: 5_000,
      }),
      cwd: tempRoot,
      planPath: resolve(tempRoot, "examples", "hello-world", "plan.ts"),
    }));

    const finalBody = (await readFile(responsePath, "utf8")).trim();
    const commitCountResult = await runChecked(tempRoot, "git", ["rev-list", "--count", "HEAD"]);
    const commitCount = Number(commitCountResult.stdout.trim());

    if (result.status !== "pass") {
      throw new Error(`expected hello-world worker loop to pass, saw ${result.status}`);
    }

    if (finalBody !== "hello world") {
      throw new Error(`expected worker to restore hello world, saw ${JSON.stringify(finalBody)}`);
    }

    if (commitCount !== 2) {
      throw new Error(`expected 2 commits in the smoke repo, saw ${commitCount}`);
    }

    return {
      status: result.status,
      commits: commitCount,
      finalBody,
    };
  } finally {
    if (typeof previousPort === "string") {
      process.env.HELLO_WORLD_PORT = previousPort;
    } else {
      delete process.env.HELLO_WORLD_PORT;
    }

    helloWorldServer?.stop(true);
    modelServer?.stop(true);
    await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
  }
};

if (import.meta.main) {
  try {
    const result = await runHelloWorldWorkerLoopSmoke();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
