import { spawnSync } from "node:child_process";
import { readLatestReport, repoRoot } from "./proof-lib";

function git(args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return "";
  }

  return result.stdout.trim();
}

const latest = readLatestReport();
const payload = latest?.payload ?? {};
const worker = typeof payload.worker === "object" && payload.worker ? payload.worker as Record<string, unknown> : {};
const commit = typeof payload.commit === "object" && payload.commit ? payload.commit as Record<string, unknown> : {};
const firstFailedGoal =
  typeof payload.firstFailedGoal === "object" && payload.firstFailedGoal
    ? payload.firstFailedGoal as Record<string, unknown>
    : {};

console.log(JSON.stringify({
  branch: git(["branch", "--show-current"]),
  head: git(["rev-parse", "--short", "HEAD"]),
  activeGate: firstFailedGoal.id ?? null,
  latestWorkerSummary: worker.summary ?? null,
  latestCheckpointSha: commit.sha ?? null,
  latestReportPath: latest?.path ?? null,
}, null, 2));

