# Gateproof

Write a gate in plan.ts. Let the loop rerun until it passes or stops.

## Tutorial

Goal: See the loop in one file.

```ts
import { Effect } from "effect";
import {
  Act,
  Assert,
  Gate,
  Plan,
  createHttpObserveResource,
  type ScopeFile,
} from "gateproof";

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
              Act.exec(
                "curl -fsS http://127.0.0.1:3000/health",
              )
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
              Assert.noErrors()
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
      maxIterations: 5,
    }),
  );

  console.log(JSON.stringify(result, null, 2));

  if (result.status !== "pass") {
    process.exitCode = 1;
  }
}

// plan.ts
```

Outcome: Hand plan.ts to a human or an agent and step back.

## How To

Task: Write a gate in plan.ts. Let the loop rerun until it passes or stops.

Done when: One file explains the work and runs the loop.

Run it:

```bash
bun run plan.ts
```

## Breaking Changes In 0.4.0

- `Prd.*` is gone
- `Claim.*` is gone
- `plan.ts` is the canonical entrypoint
- `Plan.*` replaces the old front door

## Reference

File: `plan.ts`

Goals:
- GET /health returns 200

Loop:
- maxIterations: 5

Core API:
- `Gate.define(...)`
- `Plan.define(...)`
- `Plan.run(...)`
- `Plan.runLoop(...)`

## Explanation

One file carries the human framing and the executable truth.
