import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { Effect } from "effect";
import {
  Act,
  Assert,
  createFilepathWorker,
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

const createTempRepo = async (
  files: Record<string, string> = { "README.md": "# temp\n" },
): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), "gateproof-worker-"));
  runGit(cwd, ["init"]);
  runGit(cwd, ["config", "user.name", "Gateproof Test"]);
  runGit(cwd, ["config", "user.email", "gateproof-test@example.com"]);
  for (const [path, contents] of Object.entries(files)) {
    const absolutePath = join(cwd, path);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, contents, "utf8");
  }
  runGit(cwd, ["add", "-A"]);
  runGit(cwd, ["commit", "-m", "chore: baseline"]);
  return cwd;
};

const getCommitCount = (cwd: string): number =>
  Number(runGit(cwd, ["rev-list", "--count", "HEAD"]));

const createTrackedPatch = async (
  cwd: string,
  path: string,
  contents: string,
): Promise<string> => {
  await writeFile(join(cwd, path), contents, "utf8");
  const result = spawnSync("git", ["diff", "--binary", "--relative", "HEAD", "--"], {
    cwd,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || "git diff failed");
  }

  runGit(cwd, ["checkout", "--", "."]);
  return result.stdout;
};

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

  test("createOpenCodeWorker accepts fenced JSON content and retries after an unusable reply", async () => {
    const cwd = await createTempRepo();
    let calls = 0;
    const server = Bun.serve({
      port: 0,
      fetch() {
        calls += 1;

        if (calls === 1) {
          return Response.json({
            choices: [
              {
                message: {
                  content: "I need to think about this a bit more first.",
                },
              },
            ],
          });
        }

        return Response.json({
          choices: [
            {
              message: {
                content: [
                  {
                    type: "text",
                    text: [
                      "I'll inspect the file first.",
                      "```json",
                      JSON.stringify({
                        action: "done",
                        summary: "worker recovered after retry",
                        commitMessage: "chore: retry succeeded",
                      }),
                      "```",
                    ].join("\n"),
                  },
                ],
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

      expect(calls).toBe(2);
      expect(result.summary).toBe("worker recovered after retry");
      expect(result.commitMessage).toBe("chore: retry succeeded");
    } finally {
      server.stop(true);
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test("createFilepathWorker applies a returned patch, keeps commit authority local, and reruns the loop", async () => {
    const cwd = await createTempRepo({
      "README.md": "# temp\n",
      "response.txt": "not ready\n",
    });
    const patch = await createTrackedPatch(cwd, "response.txt", "hello world\n");
    let requestBody: Record<string, unknown> | undefined;
    const server = Bun.serve({
      port: 0,
      async fetch(request) {
        requestBody = await request.json() as Record<string, unknown>;
        return Response.json({
          status: "success",
          summary: "restored hello world",
          events: [],
          filesTouched: ["response.txt"],
          violations: [],
          diffSummary: "1 file touched: response.txt",
          patch,
          commit: null,
          agentId: "agent-1",
          runId: "run-1",
          startedAt: Date.now(),
          finishedAt: Date.now(),
        });
      },
    });

    try {
      const result = await Effect.runPromise(
        Plan.runLoop(
          Plan.define({
            goals: [
              {
                id: "hello-world",
                title: "response.txt says hello world",
                gate: Gate.define({
                  act: [Act.exec("grep -qx 'hello world' response.txt", { cwd })],
                  assert: [Assert.noErrors()],
                }),
                scope: {
                  allowedPaths: ["response.txt"],
                  forbiddenPaths: ["README.md"],
                  maxChangedFiles: 1,
                },
              },
            ],
            loop: {
              maxIterations: 2,
            },
          }),
          {
            cwd,
            worker: createFilepathWorker({
              endpoint: `http://127.0.0.1:${server.port}`,
              workspaceId: "ws-hello",
              harnessId: "codex",
              model: "test-model",
              apiKey: "secret-token",
              timeoutMs: 1_000,
            }),
          },
        ),
      );

      expect(result.status).toBe("pass");
      expect((await readFile(join(cwd, "response.txt"), "utf8")).trim()).toBe("hello world");
      expect(getCommitCount(cwd)).toBe(2);
      expect(requestBody?.harnessId).toBe("codex");
      expect(requestBody?.model).toBe("test-model");
      expect((requestBody?.scope as Record<string, unknown>)?.toolPermissions).toEqual([
        "inspect",
        "search",
        "run",
        "write",
      ]);
      expect((requestBody?.scope as Record<string, unknown>)?.allowedPaths).toEqual(["response.txt"]);
      expect((requestBody?.scope as Record<string, unknown>)?.forbiddenPaths).toEqual(["README.md"]);
      expect(typeof requestBody?.content).toBe("string");
      expect(String(requestBody?.content)).toContain("\"id\": \"hello-world\"");
      expect(String(requestBody?.content)).toContain("\"snapshot\"");
    } finally {
      server.stop(true);
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test("createFilepathWorker still fails the loop when the returned patch escapes scope", async () => {
    const cwd = await createTempRepo({
      "README.md": "# temp\n",
      "response.txt": "not ready\n",
    });
    const patch = await createTrackedPatch(cwd, "README.md", "# escaped\n");
    const server = Bun.serve({
      port: 0,
      fetch() {
        return Response.json({
          status: "success",
          summary: "patched README",
          events: [],
          filesTouched: ["README.md"],
          violations: [],
          diffSummary: "1 file touched: README.md",
          patch,
          commit: null,
          agentId: "agent-2",
          runId: "run-2",
          startedAt: Date.now(),
          finishedAt: Date.now(),
        });
      },
    });

    try {
      const result = await Effect.runPromise(
        Plan.runLoop(
          Plan.define({
            goals: [
              {
                id: "hello-world",
                title: "response.txt says hello world",
                gate: Gate.define({
                  act: [Act.exec("grep -qx 'hello world' response.txt", { cwd })],
                  assert: [Assert.noErrors()],
                }),
                scope: {
                  allowedPaths: ["response.txt"],
                  forbiddenPaths: ["README.md"],
                },
              },
            ],
            loop: {
              maxIterations: 2,
            },
          }),
          {
            cwd,
            worker: createFilepathWorker({
              endpoint: `http://127.0.0.1:${server.port}`,
              workspaceId: "ws-scope",
              harnessId: "codex",
              model: "test-model",
              timeoutMs: 1_000,
            }),
          },
        ),
      );

      expect(result.status).toBe("fail");
      expect(result.summary).toContain("scope violation");
      expect(getCommitCount(cwd)).toBe(2);
    } finally {
      server.stop(true);
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test("createFilepathWorker stops with a clear summary when the returned patch cannot be applied", async () => {
    const cwd = await createTempRepo({
      "README.md": "# temp\n",
      "response.txt": "not ready\n",
    });
    const server = Bun.serve({
      port: 0,
      fetch() {
        return Response.json({
          status: "success",
          summary: "attempted change",
          events: [],
          filesTouched: ["response.txt"],
          violations: [],
          diffSummary: "1 file touched: response.txt",
          patch: "not a valid patch",
          commit: null,
          agentId: "agent-3",
          runId: "run-3",
          startedAt: Date.now(),
          finishedAt: Date.now(),
        });
      },
    });

    try {
      const result = await Effect.runPromise(
        Plan.runLoop(
          Plan.define({
            goals: [
              {
                id: "hello-world",
                title: "response.txt says hello world",
                gate: Gate.define({
                  act: [Act.exec("grep -qx 'hello world' response.txt", { cwd })],
                  assert: [Assert.noErrors()],
                }),
                scope: {
                  allowedPaths: ["response.txt"],
                },
              },
            ],
            loop: {
              maxIterations: 2,
            },
          }),
          {
            cwd,
            worker: createFilepathWorker({
              endpoint: `http://127.0.0.1:${server.port}`,
              workspaceId: "ws-apply",
              harnessId: "codex",
              model: "test-model",
              timeoutMs: 1_000,
            }),
          },
        ),
      );

      expect(result.status).toBe("fail");
      expect((await readFile(join(cwd, "response.txt"), "utf8")).trim()).toBe("not ready");
      expect(getCommitCount(cwd)).toBe(2);
      const latest = JSON.parse(
        await readFile(join(cwd, ".gateproof", "latest.json"), "utf8"),
      ) as Record<string, unknown>;
      const worker = latest.worker as Record<string, unknown>;
      expect(worker.summary).toContain("failed to apply filepath worker patch");
    } finally {
      server.stop(true);
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test("iteration reports include worker response excerpts when parsing fails", async () => {
    const cwd = await createTempRepo();
    const server = Bun.serve({
      port: 0,
      fetch() {
        return Response.json({
          choices: [
            {
              message: {
                content: "I should probably inspect crates/cinder-cli/src/main.rs first.",
              },
            },
          ],
        });
      },
    });

    try {
      await Effect.runPromise(
        Plan.runLoop(
          createFailingPlan([createFailingGoal("alpha", "Alpha gate")]),
          {
            cwd,
            worker: createOpenCodeWorker({
              endpoint: `http://127.0.0.1:${server.port}`,
              timeoutMs: 1_000,
              maxSteps: 1,
            }),
          },
        ),
      );

      const latestText = await readFile(join(cwd, ".gateproof", "latest.json"), "utf8");
      const latest = JSON.parse(latestText) as Record<string, unknown>;
      const worker = latest.worker as Record<string, unknown>;
      const debug = worker.debug as Record<string, unknown>;

      expect(worker.summary).toBe("worker did not return a usable instruction");
      expect(debug.attempts).toBe(3);
      expect(debug.rawAssistantContentExcerpt).toBe(
        "I should probably inspect crates/cinder-cli/src/main.rs first.",
      );
      expect(debug.normalizedAssistantContentExcerpt).toBe(
        "I should probably inspect crates/cinder-cli/src/main.rs first.",
      );
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
