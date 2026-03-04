import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

type SavedProof = {
  firstFailedGoal?: {
    id?: string;
    title?: string;
    summary?: string;
  } | null;
  result?: {
    status?: string;
    summary?: string;
    cleanupErrors?: ReadonlyArray<unknown>;
  };
  snapshot?: {
    cwd?: string;
    gitHead?: string;
    worktreeDiffHash?: string;
  };
};

async function runGit(
  cwd: string,
  command: string[],
): Promise<{ exitCode: number; stdout: Uint8Array; stderr: string }> {
  const subprocess = Bun.spawn(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const exitCode = await subprocess.exited;
  const stdout = new Uint8Array(await new Response(subprocess.stdout).arrayBuffer());
  const stderr = await new Response(subprocess.stderr).text();

  return {
    exitCode,
    stdout,
    stderr,
  };
}

async function getGitText(cwd: string, command: string[]): Promise<string> {
  const result = await runGit(cwd, command);
  if (result.exitCode !== 0) {
    const detail = result.stderr.trim();
    throw new Error(detail || `Command failed: ${command.join(" ")}`);
  }

  return new TextDecoder().decode(result.stdout).trim();
}

async function getGitState(
  cwd: string,
): Promise<{ insideGit: boolean; gitHead?: string; worktreeDiffHash?: string }> {
  const repoCheck = await runGit(cwd, ["git", "rev-parse", "--is-inside-work-tree"]);
  const repoText = new TextDecoder().decode(repoCheck.stdout).trim();

  if (repoCheck.exitCode !== 0 || repoText !== "true") {
    return {
      insideGit: false,
    };
  }

  const gitHead = await getGitText(cwd, ["git", "rev-parse", "HEAD"]);
  const diffResult = await runGit(cwd, ["git", "diff", "--binary", "HEAD"]);
  if (diffResult.exitCode !== 0) {
    throw new Error("Unable to read current git diff for saved proof validation");
  }

  return {
    insideGit: true,
    gitHead,
    worktreeDiffHash: createHash("sha256")
      .update(diffResult.stdout)
      .digest("hex"),
  };
}

export async function validateSavedProof(cwd: string): Promise<void> {
  const resolvedCwd = resolve(cwd);
  const latestPath = join(resolvedCwd, ".gateproof", "latest.json");

  let latestText: string;
  try {
    latestText = await readFile(latestPath, "utf8");
  } catch {
    throw new Error("No saved proof found. Run `bun run prove` first.");
  }

  let latest: SavedProof;
  try {
    latest = JSON.parse(latestText) as SavedProof;
  } catch {
    throw new Error("Saved proof is unreadable. Re-run `bun run prove`.");
  }

  const status = latest.result?.status;
  const cleanupErrors = latest.result?.cleanupErrors;
  if (status !== "pass" || !Array.isArray(cleanupErrors) || cleanupErrors.length > 0) {
    const firstFail = latest.firstFailedGoal?.id ?? latest.firstFailedGoal?.title ?? "unknown";
    const summary = latest.result?.summary ?? "no summary";
    throw new Error(
      `Saved proof is not green (status=${String(status ?? "unknown")}, firstFail=${firstFail}, summary=${summary}). Re-run \`bun run prove\`.`,
    );
  }

  if (latest.snapshot?.cwd !== resolvedCwd) {
    throw new Error("Saved proof came from a different working directory.");
  }

  const currentGitState = await getGitState(resolvedCwd);
  if (!currentGitState.insideGit) {
    return;
  }

  if (
    latest.snapshot?.gitHead !== currentGitState.gitHead ||
    latest.snapshot?.worktreeDiffHash !== currentGitState.worktreeDiffHash
  ) {
    throw new Error("Saved proof is stale. Re-run `bun run prove` before finalizing.");
  }
}
