import { describe, expect, test } from "bun:test";
import { unlink } from "node:fs/promises";
import { Effect } from "effect";
import {
  Act,
  Assert,
  Gate,
  Plan,
  Require,
  createHttpObserveResource,
  type ScopeFile,
} from "../src/index";
import { Cloudflare } from "../src/cloudflare/index";
import { renderReadme } from "../scripts/render-scope";

describe("Plan runtime", () => {
  test("passes a simple HTTP gate", async () => {
    const server = Bun.serve({
      port: 0,
      fetch() {
        return new Response("ok", { status: 200 });
      },
    });

    try {
      const result = await Effect.runPromise(
        Plan.run(
          Plan.define({
            goals: [
              {
                id: "health",
                title: "GET /health returns 200",
                gate: Gate.define({
                  observe: createHttpObserveResource({
                    url: `http://127.0.0.1:${server.port}/health`,
                  }),
                  assert: [
                    Assert.httpResponse({
                      actionIncludes: "/health",
                      status: 200,
                    }),
                    Assert.duration({
                      actionIncludes: "/health",
                      atMostMs: 1500,
                    }),
                    Assert.noErrors(),
                  ],
                }),
              },
            ],
          })
        )
      );

      expect(result.status).toBe("pass");
      expect(result.goals[0]?.status).toBe("pass");
      expect(result.proofStrength).toBe("strong");
    } finally {
      server.stop(true);
    }
  });

  test("skips when a required env var is missing", async () => {
    const result = await Effect.runPromise(
      Plan.run(
        Plan.define({
          goals: [
            {
              id: "needs-env",
              title: "Waits for TEST_API_KEY",
              gate: Gate.define({
                prerequisites: [
                  Require.env("TEST_API_KEY", "TEST_API_KEY must be set before this gate can run"),
                ],
                assert: [Assert.noErrors()],
              }),
            },
          ],
        })
      )
    );

    expect(result.status).toBe("skip");
    expect(result.goals[0]?.status).toBe("skip");
  });

  test("passes when a Cloudflare log contains the required action", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
      const url = String(args[0]);
      if (url.includes("/workers/")) {
        return Response.json({
          result: [
            {
              timestamp: new Date().toISOString(),
              message: "action=webhook_received",
            },
          ],
        });
      }

      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      const result = await Effect.runPromise(
        Plan.run(
          Plan.define({
            goals: [
              {
                id: "webhook",
                title: "Webhook action appears in logs",
                gate: Gate.define({
                  observe: Cloudflare.observe({
                    accountId: "acct",
                    apiToken: "token",
                    workerName: "worker",
                    sinceMs: 60_000,
                    pollInterval: 1,
                  }),
                  assert: [
                    Assert.hasAction("webhook_received"),
                  ],
                }),
              },
            ],
          }),
        ),
      );

      expect(result.status).toBe("pass");
      expect(result.goals[0]?.status).toBe("pass");
      expect(result.goals[0]?.evidence.logs?.[0]?.action).toBe("webhook_received");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("checks response body includes text from action stdout when no HTTP observe is configured", async () => {
    const result = await Effect.runPromise(
      Plan.run(
        Plan.define({
          goals: [
            {
              id: "body",
              title: "Action output includes a URL",
              gate: Gate.define({
                act: [
                  Act.exec("printf 'https://example.com'"),
                ],
                assert: [
                  Assert.responseBodyIncludes("https://"),
                ],
              }),
            },
          ],
        }),
      ),
    );

    expect(result.status).toBe("pass");
    expect(result.goals[0]?.status).toBe("pass");
  });

  test("checks numeric delta from log messages", async () => {
    const originalFetch = globalThis.fetch;
    const originalBaseline = process.env.COLD_BUILD_MS;
    process.env.COLD_BUILD_MS = "200000";

    globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
      const url = String(args[0]);
      if (url.includes("/workers/")) {
        return Response.json({
          result: [
            {
              timestamp: new Date().toISOString(),
              message: "action=build_complete build_duration_ms=120000",
            },
          ],
        });
      }

      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      const result = await Effect.runPromise(
        Plan.run(
          Plan.define({
            goals: [
              {
                id: "speed",
                title: "Warm build beats cold baseline",
                gate: Gate.define({
                  observe: Cloudflare.observe({
                    accountId: "acct",
                    apiToken: "token",
                    workerName: "worker",
                  }),
                  assert: [
                    Assert.hasAction("build_complete"),
                    Assert.numericDeltaFromEnv({
                      source: "logMessage",
                      pattern: "build_duration_ms=(\\d+)",
                      baselineEnv: "COLD_BUILD_MS",
                      minimumDelta: 60_000,
                    }),
                  ],
                }),
              },
            ],
          }),
        ),
      );

      expect(result.status).toBe("pass");
    } finally {
      globalThis.fetch = originalFetch;
      if (originalBaseline === undefined) {
        delete process.env.COLD_BUILD_MS;
      } else {
        process.env.COLD_BUILD_MS = originalBaseline;
      }
    }
  });

  test("runs cleanup actions after the final result", async () => {
    const cleanupMarker = `/tmp/gateproof-cleanup-${Date.now()}.txt`;

    const result = await Effect.runPromise(
      Plan.run(
        Plan.define({
          goals: [
            {
              id: "cleanup",
              title: "Gate passes before cleanup",
              gate: Gate.define({
                assert: [Assert.noErrors()],
              }),
            },
          ],
          cleanup: {
            actions: [
              Act.exec(`printf 'cleaned' > ${cleanupMarker}`),
            ],
          },
        }),
      ),
    );

    const cleanupText = await Bun.file(cleanupMarker).text();

    expect(result.status).toBe("pass");
    expect(result.cleanupErrors).toEqual([]);
    expect(cleanupText).toBe("cleaned");

    await unlink(cleanupMarker);
  });
});

describe("README generation", () => {
  test("renders a diataxis-shaped README from a scope file", () => {
    const scope = {
      spec: {
        title: "Example Scope",
        tutorial: {
          goal: "Run one gate.",
          outcome: "The gate goes green.",
        },
        howTo: {
          task: "Write a gate in plan.ts.",
          done: "The runtime can loop on the file.",
        },
        explanation: {
          summary: "This scope proves the one-file handoff shape.",
        },
      },
      plan: Plan.define({
        goals: [
          {
            id: "health",
            title: "GET /health returns 200",
            gate: Gate.define({
              observe: createHttpObserveResource({
                url: "http://127.0.0.1:3000/health",
              }),
              assert: [
                Assert.httpResponse({
                  actionIncludes: "/health",
                  status: 200,
                }),
              ],
            }),
          },
        ],
        loop: {
          maxIterations: 3,
        },
      }),
    } satisfies ScopeFile;

    const readme = renderReadme(scope);

    expect(readme).toContain("## Tutorial");
    expect(readme).toContain("## How To");
    expect(readme).toContain("## Reference");
    expect(readme).toContain("## Explanation");
    expect(readme).toContain("### alchemy.run.ts");
    expect(readme).toContain("### plan.ts");
    expect(readme).toContain("Canonical gates:");
  });
});
