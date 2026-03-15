import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { Effect } from "effect";
import type { ScopeFile } from "../src/index";

type RuntimeModule = typeof import("../src/index");
type HelloWorldServerModule = {
  startHelloWorldServer: (port?: number) => ReturnType<typeof Bun.serve>;
};

interface CommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

interface HelloWorldFilepathWorkerLoopResult {
  status: string;
  commits: number;
  finalBody: string;
  tempRoot: string;
}

const repoRoot = resolve(import.meta.dir, "..");
const tempRootBase = resolve(repoRoot, ".tmp");
const exampleRoot = resolve(repoRoot, "examples", "hello-world");
const sourceRoot = resolve(repoRoot, "src");

const nextPort = (base: number): number => base + Math.floor(Math.random() * 1000);

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for bun run example:hello-world:filepath-worker`);
  }
  return value;
}

function envFlag(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

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

export const runHelloWorldFilepathWorkerLoop = async (): Promise<HelloWorldFilepathWorkerLoopResult> => {
  const endpoint = readRequiredEnv("GATEPROOF_FILEPATH_ENDPOINT");
  const apiKey = readRequiredEnv("GATEPROOF_FILEPATH_API_KEY");
  const workspaceId = readRequiredEnv("GATEPROOF_FILEPATH_WORKSPACE_ID");
  const harnessId = readRequiredEnv("GATEPROOF_FILEPATH_HARNESS_ID");
  const model = readRequiredEnv("GATEPROOF_FILEPATH_MODEL");

  await mkdir(tempRootBase, { recursive: true });
  const tempRoot = await mkdtemp(resolve(tempRootBase, "hello-world-filepath-worker-"));
  const tempExampleRoot = resolve(tempRoot, "examples", "hello-world");
  const responsePath = resolve(tempExampleRoot, "response.txt");
  const helloWorldPort = nextPort(33_000);
  const previousPort = process.env.HELLO_WORLD_PORT;
  const keepTemp = envFlag("GATEPROOF_FILEPATH_KEEP_TMP");
  let helloWorldServer: ReturnType<typeof Bun.serve> | undefined;

  try {
    await cp(exampleRoot, tempExampleRoot, { recursive: true });
    await cp(sourceRoot, resolve(tempRoot, "src"), { recursive: true });

    await runChecked(tempRoot, "git", ["init"]);
    await runChecked(tempRoot, "git", ["branch", "-M", "main"]);
    await runChecked(tempRoot, "git", ["config", "user.name", "Gateproof Smoke"]);
    await runChecked(tempRoot, "git", ["config", "user.email", "smoke@gateproof.local"]);
    await runChecked(tempRoot, "git", ["add", "-A"]);
    await runChecked(tempRoot, "git", ["commit", "-m", "chore: hello world baseline"]);

    process.env.HELLO_WORLD_PORT = String(helloWorldPort);

    const runtime = (await import(
      pathToFileURL(resolve(tempRoot, "src", "index.ts")).href
    )) as RuntimeModule;
    const serverModule = (await import(
      pathToFileURL(resolve(tempRoot, "examples", "hello-world", "server.ts")).href
    )) as HelloWorldServerModule;
    const workerScope: ScopeFile = {
      spec: {
        title: "filepath Worker Alpha",
        tutorial: {
          goal: "Prove the filepath worker can return a patch Gateproof can apply locally.",
          outcome: "The run only passes when the live hello-world response changes to hello from filepath.",
        },
        howTo: {
          task: "Run the failing hello-world gate through the filepath worker runtime.",
          done: "The endpoint returns 200 and the body contains hello from filepath.",
        },
        explanation: {
          summary: "This is an internal alpha witness for Gateproof's filepath-backed worker adapter.",
        },
      },
      plan: runtime.Plan.define({
        goals: [
          {
            id: "hello-world-filepath-alpha",
            title: "examples/hello-world/response.txt drives GET / and must say hello from filepath",
            scope: {
              allowedPaths: ["examples/hello-world/"],
              maxChangedFiles: 1,
              maxChangedLines: 5,
            },
            gate: runtime.Gate.define({
              observe: runtime.createHttpObserveResource({
                url: `http://127.0.0.1:${helloWorldPort}/`,
              }),
              act: [runtime.Act.exec(`curl -sf http://127.0.0.1:${helloWorldPort}/`)],
              assert: [
                runtime.Assert.httpResponse({ status: 200 }),
                runtime.Assert.responseBodyIncludes("hello from filepath"),
                runtime.Assert.noErrors(),
              ],
            }),
          },
        ],
        loop: {
          maxIterations: 3,
          stopOnFailure: true,
        },
      }),
    };

    helloWorldServer = serverModule.startHelloWorldServer(helloWorldPort);
    await waitForServer(`http://127.0.0.1:${helloWorldPort}/`);

    const result = await Effect.runPromise(runtime.Plan.runLoop(workerScope.plan, {
      maxIterations: 3,
      worker: runtime.createFilepathWorker({
        endpoint,
        apiKey,
        workspaceId,
        harnessId,
        model,
        timeoutMs: 10 * 60 * 1000,
      }),
      cwd: tempRoot,
      planPath: resolve(tempRoot, "examples", "hello-world", "plan.ts"),
    }));

    const finalBody = (await readFile(responsePath, "utf8")).trim();
    const commitCountResult = await runChecked(tempRoot, "git", ["rev-list", "--count", "HEAD"]);
    const commitCount = Number(commitCountResult.stdout.trim());

    if (result.status !== "pass") {
      const latestPath = resolve(tempRoot, ".gateproof", "latest.json");
      const latestText = await readFile(latestPath, "utf8").catch(() => "");
      throw new Error(
        [
          `expected hello-world filepath worker loop to pass, saw ${result.status}`,
          `temp root: ${tempRoot}`,
          latestText ? `latest report:\n${latestText}` : "",
        ].filter(Boolean).join("\n\n"),
      );
    }

    if (finalBody !== "hello from filepath") {
      throw new Error(`expected local worker patch to set hello from filepath, saw ${JSON.stringify(finalBody)}`);
    }

    if (commitCount !== 2) {
      throw new Error(`expected 2 commits in the smoke repo, saw ${commitCount}`);
    }

    return {
      status: result.status,
      commits: commitCount,
      finalBody,
      tempRoot,
    };
  } finally {
    if (typeof previousPort === "string") {
      process.env.HELLO_WORLD_PORT = previousPort;
    } else {
      delete process.env.HELLO_WORLD_PORT;
    }

    helloWorldServer?.stop(true);
    if (!keepTemp) {
      await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
    }
  }
};

if (import.meta.main) {
  try {
    const result = await runHelloWorldFilepathWorkerLoop();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
