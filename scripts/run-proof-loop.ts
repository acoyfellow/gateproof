import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { Effect } from "effect";
import { Plan, createOpenCodeWorker } from "../src/index";
import { loadScope, loopBasePath, planPath, repoRoot } from "./proof-lib";

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for bun run prove`);
  }
  return value;
}

function readOptionalInt(name: string): number | undefined {
  const value = process.env[name]?.trim();
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

const defaultWorkerPrompt =
  "Fix only the first failing gate. Keep plan.ts, README.md, and case-study content human-owned unless the active scope explicitly allows them.";

function gitOutput(args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim();
    throw new Error(detail || `git ${args.join(" ")} failed`);
  }

  return result.stdout.trim();
}

async function ensureLoopBaseline(branch: string): Promise<void> {
  try {
    gitOutput(["diff", "--quiet"]);
    gitOutput(["diff", "--cached", "--quiet"]);
  } catch {
    throw new Error("bun run prove requires a clean working tree before the loop starts");
  }

  const existing = Bun.file(loopBasePath);
  if (await existing.exists()) {
    return;
  }

  await mkdir(dirname(loopBasePath), { recursive: true });
  await writeFile(
    loopBasePath,
    JSON.stringify({
      branch,
      baseSha: gitOutput(["rev-parse", "HEAD"]),
      planPath,
      timestamp: new Date().toISOString(),
    }, null, 2),
    "utf8",
  );
}

async function main() {
  const scope = await loadScope();
  const branch = gitOutput(["branch", "--show-current"]);
  const endpoint = readRequiredEnv("GATEPROOF_WORKER_ENDPOINT");
  if (branch === "main") {
    throw new Error("bun run prove refuses to run on main; use a codex/* branch");
  }
  if (!branch.startsWith("codex/")) {
    throw new Error(`bun run prove requires a codex/* branch, got ${JSON.stringify(branch)}`);
  }

  await ensureLoopBaseline(branch);
  const apiKey = process.env.GATEPROOF_WORKER_API_KEY?.trim();
  const model = process.env.GATEPROOF_WORKER_MODEL?.trim() || "gpt-5.3-codex";
  const maxSteps = readOptionalInt("GATEPROOF_WORKER_MAX_STEPS") ?? 4;

  const result = await Effect.runPromise(
    Plan.runLoop(scope.plan, {
      cwd: repoRoot,
      planPath,
      maxIterations: Math.max(scope.plan.loop?.maxIterations ?? 1, 6),
      rerunFailedGoalPrefix: true,
      worker: createOpenCodeWorker({
        endpoint,
        apiKey,
        model,
        maxSteps,
        timeoutMs: 10 * 60 * 1000,
        prompt: defaultWorkerPrompt,
      }),
      commit: {
        enabled: true,
        allowEmpty: false,
      },
      onIteration: (status) => {
        console.log(JSON.stringify({
          iteration: status.iteration,
          firstFailedGoal: status.firstFailedGoal?.id ?? null,
          workerCalled: status.workerCalled,
          workerSummary: status.workerSummary,
          committed: status.committed,
          commitSha: status.commitSha,
          reportPath: status.reportPath,
        }));
      },
    }),
  );

  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "pass") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
