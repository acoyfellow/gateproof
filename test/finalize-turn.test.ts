import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { validateSavedProof } from "../scripts/finalize-turn-lib";

const runGit = (cwd: string, args: ReadonlyArray<string>): Buffer => {
  const result = spawnSync("git", args, {
    cwd,
    encoding: null,
  });

  if (result.status !== 0) {
    throw new Error((result.stderr?.toString("utf8") ?? "") || `git ${args.join(" ")} failed`);
  }

  return result.stdout ?? Buffer.alloc(0);
};

const createTempRepo = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), "gateproof-finalize-"));
  runGit(cwd, ["init"]);
  runGit(cwd, ["config", "user.name", "Gateproof Test"]);
  runGit(cwd, ["config", "user.email", "gateproof-test@example.com"]);
  await writeFile(join(cwd, "README.md"), "# temp\n", "utf8");
  runGit(cwd, ["add", "README.md"]);
  runGit(cwd, ["commit", "-m", "chore: baseline"]);
  return cwd;
};

const writeSavedProof = async (
  cwd: string,
  options?: {
    status?: string;
    cleanupErrors?: ReadonlyArray<string>;
    snapshotCwd?: string;
  },
): Promise<void> => {
  const gitHead = runGit(cwd, ["rev-parse", "HEAD"]).toString("utf8").trim();
  const diffBytes = runGit(cwd, ["diff", "--binary", "HEAD"]);
  const latest = {
    iteration: 1,
    timestamp: new Date().toISOString(),
    firstFailedGoal: options?.status === "pass"
      ? null
      : {
        id: "alpha",
        title: "Alpha gate",
        summary: "expected failure",
      },
    result: {
      status: options?.status ?? "pass",
      summary: "test summary",
      cleanupErrors: options?.cleanupErrors ?? [],
    },
    snapshot: {
      cwd: options?.snapshotCwd ?? cwd,
      gitHead,
      worktreeDiffHash: createHash("sha256").update(diffBytes).digest("hex"),
    },
  };

  await mkdir(join(cwd, ".gateproof"), { recursive: true });
  await writeFile(
    join(cwd, ".gateproof", "latest.json"),
    `${JSON.stringify(latest, null, 2)}\n`,
    "utf8",
  );
};

describe("turn:finalize saved proof validation", () => {
  test("fails when no saved proof exists", async () => {
    const cwd = await createTempRepo();

    try {
      await expect(validateSavedProof(cwd)).rejects.toThrow(
        "No saved proof found. Run `bun run prove` first.",
      );
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test("fails when the saved proof is not green", async () => {
    const cwd = await createTempRepo();

    try {
      await writeSavedProof(cwd, {
        status: "fail",
      });

      await expect(validateSavedProof(cwd)).rejects.toThrow("Saved proof is not green");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test("fails when the saved proof is stale", async () => {
    const cwd = await createTempRepo();

    try {
      await writeSavedProof(cwd);
      await writeFile(join(cwd, "README.md"), "# changed\n", "utf8");

      await expect(validateSavedProof(cwd)).rejects.toThrow(
        "Saved proof is stale. Re-run `bun run prove` before finalizing.",
      );
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test("passes when the saved proof matches the current repo state", async () => {
    const cwd = await createTempRepo();

    try {
      await writeSavedProof(cwd);

      await expect(validateSavedProof(cwd)).resolves.toBeUndefined();
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
