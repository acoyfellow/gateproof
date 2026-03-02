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

const installCloudflareTailMocks = (
  messages: ReadonlyArray<unknown>,
  options?: {
    autoOpen?: boolean;
    autoOpenSequence?: ReadonlyArray<boolean>;
    createTimeout?: boolean;
  },
): (() => void) => {
  const originalFetch = globalThis.fetch;
  const originalWebSocket = globalThis.WebSocket;
  const autoOpen = options?.autoOpen ?? true;
  const autoOpenSequence = options?.autoOpenSequence;
  const createTimeout = options?.createTimeout ?? false;
  let socketCount = 0;

  const materializeMessage = (message: unknown): unknown => {
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      return message;
    }

    const now = Date.now();
    const payload = { ...(message as Record<string, unknown>) };

    if (typeof payload.eventTimestamp === "number") {
      payload.eventTimestamp = now;
    }

    if (Array.isArray(payload.logs)) {
      payload.logs = payload.logs.map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return entry;
        }

        const logEntry = { ...(entry as Record<string, unknown>) };
        if (typeof logEntry.timestamp === "number") {
          logEntry.timestamp = now;
        }
        return logEntry;
      });
    }

    return payload;
  };

  class MockWebSocket extends EventTarget {
    readonly url: string;
    readonly protocol: string;
    readyState = 0;

    constructor(url: string | URL, protocols?: string | string[]) {
      super();
      this.url = String(url);
      this.protocol = Array.isArray(protocols)
        ? (protocols[0] ?? "")
        : (protocols ?? "");
      const shouldAutoOpen =
        autoOpenSequence?.[socketCount] ?? autoOpen;
      socketCount += 1;

      if (shouldAutoOpen) {
        queueMicrotask(() => {
          this.readyState = 1;
          this.dispatchEvent(new Event("open"));
        });
      }
    }

    send(_data: string): void {
      for (const message of messages) {
        queueMicrotask(() => {
          this.dispatchEvent(
            new MessageEvent("message", {
              data: JSON.stringify(materializeMessage(message)),
            }),
          );
        });
      }
    }

    close(): void {
      this.readyState = 3;
      this.dispatchEvent(new Event("close"));
    }
  }

  globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
    const url = String(args[0]);
    const init = args[1];
    const method = init?.method ?? "GET";

    if (url.includes("/tails") && method === "POST") {
      if (createTimeout) {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        });
      }

      return Response.json({
        success: true,
        result: {
          id: "tail-id",
          url: "wss://tail.example",
        },
      });
    }

    if (url.includes("/tails/tail-id") && method === "DELETE") {
      return Response.json({
        success: true,
      });
    }

    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;

  return () => {
    globalThis.fetch = originalFetch;
    globalThis.WebSocket = originalWebSocket;
  };
};

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

  test("fails hard when a required env var is missing", async () => {
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

    expect(result.status).toBe("fail");
    expect(result.goals[0]?.status).toBe("fail");
    expect(result.goals[0]?.summary).toContain("TEST_API_KEY must be set before this gate can run");
  });

  test("passes when a Cloudflare log contains the required action", async () => {
    const restore = installCloudflareTailMocks([
      {
        eventTimestamp: Date.now(),
        outcome: "ok",
        scriptName: "worker",
        logs: [
          {
            timestamp: Date.now(),
            level: "log",
            message: ["action=webhook_received"],
          },
        ],
      },
    ]);

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
      restore();
    }
  });

  test("degrades to inconclusive when Cloudflare logs cannot be parsed", async () => {
    const restore = installCloudflareTailMocks([
      "{",
    ]);

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
                  timeoutMs: 50,
                  assert: [Assert.hasAction("webhook_received")],
                }),
              },
            ],
          }),
        ),
      );

      expect(result.status).toBe("inconclusive");
      expect(result.goals[0]?.status).toBe("inconclusive");
      expect(result.goals[0]?.summary).toContain("missing log evidence");
    } finally {
      restore();
    }
  });

  test("returns promptly when Cloudflare yields no log events", async () => {
    const restore = installCloudflareTailMocks([]);

    try {
      const startedAt = Date.now();
      const result = await Effect.runPromise(
        Plan.run(
          Plan.define({
            goals: [
              {
                id: "quiet-worker",
                title: "Quiet worker returns promptly",
                gate: Gate.define({
                  observe: Cloudflare.observe({
                    accountId: "acct",
                    apiToken: "token",
                    workerName: "worker",
                    sinceMs: 60_000,
                    pollInterval: 1,
                  }),
                  assert: [
                    Assert.hasAction("never_happens"),
                  ],
                  timeoutMs: 10_000,
                }),
              },
            ],
          }),
        ),
      );

      expect(Date.now() - startedAt).toBeLessThan(4_000);
      expect(result.status).toBe("inconclusive");
      expect(result.goals[0]?.summary).toContain("missing log evidence");
    } finally {
      restore();
    }
  });

  test("returns promptly when Cloudflare tail creation times out", async () => {
    const restore = installCloudflareTailMocks([], { createTimeout: true });

    try {
      const startedAt = Date.now();
      const result = await Effect.runPromise(
        Plan.run(
          Plan.define({
            goals: [
              {
                id: "tail-timeout",
                title: "Cloudflare tail create timeout",
                gate: Gate.define({
                  observe: Cloudflare.observe({
                    accountId: "acct",
                    apiToken: "token",
                    workerName: "worker",
                  }),
                  assert: [Assert.hasAction("webhook_received")],
                }),
              },
            ],
          }),
        ),
      );

      expect(result.status).toBe("inconclusive");
      expect(result.goals[0]?.status).toBe("inconclusive");
      expect(Date.now() - startedAt).toBeLessThan(6_500);
    } finally {
      restore();
    }
  });

  test("returns promptly when the Cloudflare tail websocket never opens", async () => {
    const restore = installCloudflareTailMocks([], { autoOpen: false });

    try {
      const startedAt = Date.now();
      const result = await Effect.runPromise(
        Plan.run(
          Plan.define({
            goals: [
              {
                id: "tail-never-opens",
                title: "Cloudflare tail websocket never opens",
                gate: Gate.define({
                  observe: Cloudflare.observe({
                    accountId: "acct",
                    apiToken: "token",
                    workerName: "worker",
                  }),
                  assert: [Assert.hasAction("webhook_received")],
                }),
              },
            ],
          }),
        ),
      );

      expect(result.status).toBe("inconclusive");
      expect(result.goals[0]?.status).toBe("inconclusive");
      expect(Date.now() - startedAt).toBeLessThan(5_000);
    } finally {
      restore();
    }
  });

  test("retries Cloudflare tail setup once before giving up", async () => {
    const restore = installCloudflareTailMocks(
      [
        {
          eventTimestamp: Date.now(),
          outcome: "ok",
          scriptName: "worker",
          logs: [
            {
              timestamp: Date.now(),
              level: "log",
              message: ["action=webhook_received"],
            },
          ],
        },
      ],
      { autoOpenSequence: [false, true] },
    );

    try {
      const result = await Effect.runPromise(
        Plan.run(
          Plan.define({
            goals: [
              {
                id: "tail-retry",
                title: "Cloudflare tail retries once",
                gate: Gate.define({
                  observe: Cloudflare.observe({
                    accountId: "acct",
                    apiToken: "token",
                    workerName: "worker",
                    sinceMs: 60_000,
                    pollInterval: 1,
                  }),
                  assert: [Assert.hasAction("webhook_received")],
                }),
              },
            ],
          }),
        ),
      );

      expect(result.status).toBe("pass");
      expect(result.goals[0]?.status).toBe("pass");
    } finally {
      restore();
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
    const originalBaseline = process.env.COLD_BUILD_MS;
    process.env.COLD_BUILD_MS = "200000";
    const restore = installCloudflareTailMocks([
      {
        eventTimestamp: Date.now(),
        outcome: "ok",
        scriptName: "worker",
        logs: [
          {
            timestamp: Date.now(),
            level: "log",
            message: ["action=build_complete build_duration_ms=120000"],
          },
        ],
      },
    ]);

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
      restore();
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

  test("includes cleanup failures in the final summary without overwriting the gate result", async () => {
    const result = await Effect.runPromise(
      Plan.run(
        Plan.define({
          goals: [
            {
              id: "cleanup-errors",
              title: "Gate passes before cleanup fails",
              gate: Gate.define({
                assert: [Assert.noErrors()],
              }),
            },
          ],
          cleanup: {
            actions: [Act.exec("exit 1")],
          },
        }),
      ),
    );

    expect(result.status).toBe("pass");
    expect(result.cleanupErrors).toHaveLength(1);
    expect(result.summary).toContain("cleanup issues:");
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
    expect(readme).toContain("## First Case Study: Cinder");
    expect(readme).toContain("### examples/hello-world/plan.ts");
    expect(readme).toContain("### alchemy.run.ts");
    expect(readme).toContain("### plan.ts");
    expect(readme).toContain("Canonical gates:");
  });
});
