import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { loopBasePath, readLoopBase, repoRoot } from "./proof-lib";

function runGit(args: string[]): string {
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

async function runCommand(command: string[], cwd = repoRoot): Promise<void> {
  const subprocess = Bun.spawn(command, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await subprocess.exited;
  if (exitCode !== 0) {
    throw new Error(`Command failed: ${command.join(" ")}`);
  }
}

async function main() {
  const commitMessage = process.argv.slice(2).join(" ").trim();
  if (!commitMessage) {
    throw new Error('usage: bun run prove:finalize -- "<commit message>"');
  }

  const loopBase = readLoopBase();
  if (!loopBase) {
    throw new Error("No active proof loop baseline found");
  }

  const currentBranch = runGit(["branch", "--show-current"]);
  if (currentBranch !== loopBase.branch) {
    throw new Error(
      `Current branch ${JSON.stringify(currentBranch)} does not match loop baseline ${JSON.stringify(loopBase.branch)}`,
    );
  }

  const statusBefore = runGit(["status", "--short"]);
  if (statusBefore !== "") {
    throw new Error("Working tree must be clean before prove:finalize");
  }

  await runCommand(["bun", "run", "prove:once"]);

  const headSha = runGit(["rev-parse", "HEAD"]);
  if (headSha === loopBase.baseSha) {
    throw new Error("No checkpoint commits exist since the loop baseline");
  }

  runGit(["reset", "--soft", loopBase.baseSha]);
  try {
    runGit(["commit", "-m", commitMessage]);
  } catch (error) {
    runGit(["reset", "--hard", headSha]);
    throw error;
  }

  await rm(loopBasePath, { force: true });
  console.log("prove:finalize completed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
