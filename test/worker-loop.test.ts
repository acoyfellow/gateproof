import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { Effect } from "effect";
import {
  Act,
  Assert,
  Gate,
  Plan,
  createOpenCodeWorker,
  type GateRunResult,
  type LoopIterationStatus,
  type PlanDefinition,
  type WorkerContext,
  type WorkerResult,
} from "../src/index";

const runGit = (cwd: string, args: ReadonlyArray<string>): string => {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  }

  return result.stdout.trim();
};

const createTempRepo = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), "gateproof-worker-"));
  runGit(cwd, ["init"]);
  runGit(cwd, ["config", "user.name", "Gateproof Test"]);
  runGit(cwd, ["config", "user.email", "gateproof-test@example.com"]);
  await writeFile(join(cwd, "README.md"), "# temp\n", "utf8");
  runGit(cwd, ["add", "README.md"]);
  runGit(cwd, ["commit", "-m", "chore: baseline"]);
  return cwd;
};

const getCommitCount = (cwd: string): number =>
  Number(runGit(cwd, ["rev-list", "--count", "HEAD"]));

const createFailingPlan = (
  goals: ReadonlyArray<PlanDefinition["goals"][number]>,
): PlanDefinition =>
  Plan.define({
    goals,
    loop: {
      maxIterations: 2,
    },
  });

const createFailingGoal = (id: string, title: string) => ({
  id,
  title,
  gate: Gate.define({
    act: [Act.exec("false")],
    assert: [Assert.noErrors()],
  }),
});

describe("Worker loop", () => {
  test("passes the first failing gate to the worker and commits the attempt", async () => {
    const cwd = await createTempRepo();
    let observedContext: WorkerContext | undefined;

    try {
      const result = await Effect.runPromise(
        Plan.runLoop(
          createFailingPlan([
            createFailingGoal("alpha", "Alpha gate"),
            createFailingGoal("beta", "Beta gate"),
          ]),
          {
            cwd,
            worker: (context) => {
              observedContext = context;
              const workerResult: WorkerResult = {
                changes: [],
                summary: "no-op worker attempt",
                stop: true,
              };
              return Effect.succeed(workerResult);
            },
          },
        ),
      );

      expect(result.status).toBe("fail");
      expect(observedContext?.firstFailedGoal?.id).toBe("alpha");
      expect(observedContext?.failedGoals.map((goal) => goal.id)).toEqual(["alpha", "beta"]);
      expect(getCommitCount(cwd)).toBe(2);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test("does not call the worker when the plan already passes", async () => {
    const cwd = await createTempRepo();
    let workerCalled = false;

    try {
      const result = await Effect.runPromise(
        Plan.runLoop(
          Plan.define({
            goals: [
              {
                id: "ok",
                title: "true command succeeds",
                gate: Gate.define({
                  act: [Act.exec("true")],
                  assert: [Assert.noErrors()],
                }),
              },
            ],
            loop: {
              maxIterations: 2,
            },
          }),
          {
            cwd,
            worker: (_context) => {
              workerCalled = true;
              return Effect.succeed({
                changes: [],
                summary: "should not run",
              });
            },
          },
        ),
      );

      expect(result.status).toBe("pass");
      expect(workerCalled).toBe(false);
      expect(getCommitCount(cwd)).toBe(1);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test("writes .gateproof/latest.json on an immediate pass without a worker", async () => {
    const cwd = await createTempRepo();

    try {
      const result = await Effect.runPromise(
        Plan.runLoop(
          Plan.define({
            goals: [
              {
                id: "ok",
                title: "true command succeeds",
                gate: Gate.define({
                  act: [Act.exec("true")],
                  assert: [Assert.noErrors()],
                }),
              },
            ],
          }),
          {
            cwd,
          },
        ),
      );

      expect(result.status).toBe("pass");
      const latestText = await readFile(join(cwd, ".gateproof", "latest.json"), "utf8");
      const latest = JSON.parse(latestText) as Record<string, unknown>;
      expect(latest.result).toBeDefined();
      expect((latest.result as Record<string, unknown>).status).toBe("pass");
      expect(latest.worker).toBeUndefined();
      expect(latest.commit).toBeUndefined();
      expect((latest.snapshot as Record<string, unknown>).cwd).toBe(cwd);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test("reruns only through the first failing gate when rerunFailedGoalPrefix is enabled", async () => {
    const cwd = await createTempRepo();

    try {
      const result = await Effect.runPromise(
        Plan.runLoop(
          Plan.define({
            goals: [
              {
                id: "alpha",
                title: "Alpha gate",
                gate: Gate.define({
                  act: [Act.exec("true")],
                  assert: [Assert.noErrors()],
                }),
              },
              {
                id: "beta",
                title: "Beta gate",
                gate: Gate.define({
                  act: [Act.exec("false")],
                  assert: [Assert.noErrors()],
                }),
              },
              {
                id: "gamma",
                title: "Gamma gate",
                gate: Gate.define({
                  act: [Act.exec("false")],
                  assert: [Assert.noErrors()],
                }),
              },
            ],
            loop: {
              maxIterations: 2,
            },
          }),
          {
            cwd,
            rerunFailedGoalPrefix: true,
            worker: () =>
              Effect.succeed({
                changes: [],
                summary: "no-op worker attempt",
              }),
          },
        ),
      );

      expect(result.status).toBe("fail");
      expect(result.goals.map((goal) => goal.id)).toEqual(["alpha", "beta"]);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test("writes .gateproof/latest.json on an immediate fail without a worker", async () => {
    const cwd = await createTempRepo();

    try {
      const result = await Effect.runPromise(
        Plan.runLoop(
          Plan.define({
            goals: [createFailingGoal("alpha", "Alpha gate")],
            loop: {
              stopOnFailure: true,
            },
          }),
          {
            cwd,
          },
        ),
      );

      expect(result.status).toBe("fail");
      const latestText = await readFile(join(cwd, ".gateproof", "latest.json"), "utf8");
      const latest = JSON.parse(latestText) as Record<string, unknown>;
      expect((latest.result as Record<string, unknown>).status).toBe("fail");
      expect((latest.firstFailedGoal as Record<string, unknown>).id).toBe("alpha");
      expect(latest.worker).toBeUndefined();
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test("stops on a scope violation, writes a report, and still commits the attempt", async () => {
    const cwd = await createTempRepo();
    let iterationStatus: LoopIterationStatus | undefined;

    try {
      const result = await Effect.runPromise(
        Plan.runLoop(
          Plan.define({
            goals: [
              {
                ...createFailingGoal("scope", "Scope gate"),
                scope: {
                  allowedPaths: ["src/"],
                  forbiddenPaths: ["notes.txt"],
                },
              },
            ],
            loop: {
              maxIterations: 3,
            },
          }),
          {
            cwd,
            worker: (_context) =>
              Effect.tryPromise(async () => {
                await writeFile(join(cwd, "notes.txt"), "changed\n", "utf8");
                const workerResult: WorkerResult = {
                  changes: [
                    {
                      kind: "write",
                      path: "notes.txt",
                      summary: "wrote notes.txt",
                    },
                  ],
                  summary: "wrote forbidden file",
                };
                return workerResult;
              }).pipe(
                Effect.catch(() =>
                  Effect.succeed({
                    changes: [],
                    summary: "worker failed unexpectedly",
                  }),
                ),
              ),
            onIteration: (status) => {
              iterationStatus = status;
            },
          },
        ),
      );

      expect(result.status).toBe("fail");
      expect(result.summary).toContain("scope violation");
      expect(iterationStatus?.reportPath).toBeDefined();
      expect(iterationStatus?.committed).toBe(true);
      const reportPath = join(cwd, ".gateproof", "iterations", "1.json");
      const reportText = await readFile(reportPath, "utf8");
      expect(reportText).toContain("scope violation");
      expect(getCommitCount(cwd)).toBe(2);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test("createOpenCodeWorker returns a structured worker result", async () => {
    const cwd = await createTempRepo();
    const server = Bun.serve({
      port: 0,
      fetch() {
        return Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  action: "done",
                  summary: "worker completed without changes",
                  commitMessage: "chore: no-op",
                }),
              },
            },
          ],
        });
      },
    });

    try {
      const worker = createOpenCodeWorker({
        endpoint: `http://127.0.0.1:${server.port}`,
        timeoutMs: 1_000,
      });

      if (!worker) {
        throw new Error("worker was not created");
      }

      const context: WorkerContext = {
        iteration: 1,
        plan: createFailingPlan([createFailingGoal("alpha", "Alpha gate")]),
        result: {
          status: "fail",
          proofStrength: "weak",
          iterations: 1,
          goals: [
            {
              id: "alpha",
              title: "Alpha gate",
              status: "fail",
              proofStrength: "weak",
              summary: "expected failure",
              evidence: {
                actions: [],
                errors: ["expected failure"],
              },
            } satisfies GateRunResult,
          ],
          summary: "one or more gates failed",
          cleanupErrors: [],
        },
        failedGoals: [
          {
            id: "alpha",
            title: "Alpha gate",
            status: "fail",
            proofStrength: "weak",
            summary: "expected failure",
            evidence: {
              actions: [],
              errors: ["expected failure"],
            },
          },
        ],
        firstFailedGoal: {
          id: "alpha",
          title: "Alpha gate",
          status: "fail",
          proofStrength: "weak",
          summary: "expected failure",
          evidence: {
            actions: [],
            errors: ["expected failure"],
          },
        },
        cwd,
        planPath: "plan.ts",
      };

      const result = await Effect.runPromise(worker(context));

      expect(result.summary).toBe("worker completed without changes");
      expect(result.commitMessage).toBe("chore: no-op");
      expect(result.changes).toEqual([]);
    } finally {
      server.stop(true);
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test("writes iteration reports into .gateproof/latest.json", async () => {
    const cwd = await createTempRepo();

    try {
      await Effect.runPromise(
        Plan.runLoop(
          createFailingPlan([createFailingGoal("alpha", "Alpha gate")]),
          {
            cwd,
            worker: () =>
              Effect.succeed({
                changes: [],
                summary: "report check",
                stop: true,
              }),
          },
        ),
      );

      const latestPath = join(cwd, ".gateproof", "latest.json");
      const latestText = await readFile(latestPath, "utf8");
      expect(latestText).toContain("\"iteration\": 1");
      expect(latestText).toContain("report check");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test("captures git head and tracked diff hash in the latest report", async () => {
    const cwd = await createTempRepo();

    try {
      await writeFile(join(cwd, "README.md"), "# changed\n", "utf8");

      await Effect.runPromise(
        Plan.runLoop(
          Plan.define({
            goals: [
              {
                id: "ok",
                title: "true command succeeds",
                gate: Gate.define({
                  act: [Act.exec("true")],
                  assert: [Assert.noErrors()],
                }),
              },
            ],
          }),
          {
            cwd,
            planPath: "plan.ts",
          },
        ),
      );

      const latestText = await readFile(join(cwd, ".gateproof", "latest.json"), "utf8");
      const latest = JSON.parse(latestText) as Record<string, unknown>;
      const snapshot = latest.snapshot as Record<string, unknown>;
      expect(typeof snapshot.gitHead).toBe("string");
      expect((snapshot.gitHead as string).length).toBeGreaterThan(0);
      expect(typeof snapshot.worktreeDiffHash).toBe("string");
      expect((snapshot.worktreeDiffHash as string).length).toBe(64);
      expect(snapshot.planPath).toBe("plan.ts");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
