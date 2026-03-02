import { Effect } from "effect";
import type { ScopeFile } from "./src/index";
import {
  Act,
  Assert,
  Gate,
  Plan,
  createHttpObserveResource,
} from "./src/index";

const scope = {
  spec: {
    title: "Gateproof",
    tutorial: {
      goal: "See the loop in one file.",
      outcome: "Hand plan.ts to a human or an agent and step back.",
    },
    howTo: {
      task: "Write a gate in plan.ts. Let the loop rerun until it passes or stops.",
      done: "One file explains the work and runs the loop.",
    },
    explanation: {
      summary: "One file carries the human framing and the executable truth.",
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
            pollInterval: 250,
          }),
          act: [
            Act.exec("curl -fsS http://127.0.0.1:3000/health"),
          ],
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
    loop: {
      maxIterations: 5,
    },
  }),
} satisfies ScopeFile;

export default scope;

if (import.meta.main) {
  const result = await Effect.runPromise(
    Plan.runLoop(scope.plan, {
      maxIterations: scope.plan.loop?.maxIterations,
    }),
  );

  console.log(JSON.stringify(result, null, 2));

  if (result.status !== "pass") {
    process.exitCode = 1;
  }
}
