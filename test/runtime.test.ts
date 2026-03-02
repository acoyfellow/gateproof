import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import {
  Assert,
  Gate,
  Plan,
  Require,
  createHttpObserveResource,
  type ScopeFile,
} from "../src/index";
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
    expect(readme).toContain("File: `plan.ts`");
  });
});
