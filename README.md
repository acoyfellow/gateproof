# Gateproof

Gateproof runs the proof, sends in the worker, and keeps going until the live claim is true.

## Tutorial

Goal: Start with one tiny gate that is small on purpose and complete on purpose.

### examples/hello-world/plan.ts

```ts
import { Effect } from "effect";
import {
  Act,
  Assert,
  Gate,
  Plan,
  createHttpObserveResource,
  type ScopeFile,
} from "../../src/index";
import { HELLO_WORLD_PORT } from "./server";

const baseUrl = `http://127.0.0.1:${HELLO_WORLD_PORT}`;

const scope = {
  spec: {
    title: "Hello World",
    tutorial: {
      goal: "Prove one tiny thing.",
      outcome: "The run only passes when the live response says hello world.",
    },
    howTo: {
      task: "Run one complete gate from one file.",
      done: "The endpoint returns 200 and the body contains hello world.",
    },
    explanation: {
      summary: "Even the smallest run is still a real proof loop.",
    },
  },
  plan: Plan.define({
    goals: [
      {
        id: "hello-world",
        title: "GET / returns hello world",
        gate: Gate.define({
          observe: createHttpObserveResource({
            url: `${baseUrl}/`,
          }),
          act: [Act.exec(`curl -sf ${baseUrl}/`)],
          assert: [
            Assert.httpResponse({ status: 200 }),
            Assert.responseBodyIncludes("hello world"),
            Assert.noErrors(),
          ],
        }),
      },
    ],
    loop: {
      maxIterations: 1,
      stopOnFailure: true,
    },
  }),
} satisfies ScopeFile;

export default scope;

if (import.meta.main) {
  const result = await Effect.runPromise(Plan.runLoop(scope.plan));
  console.log(JSON.stringify(result, null, 2));

  if (result.status !== "pass") {
    process.exitCode = 1;
  }
}
```

Outcome: The loop only passes when the live response says hello world.

## First Case Study: Cinder

The Cinder case study is now one ongoing record with three earned chapters:

- Chapter 1 preserves the original historical Cargo-fixture proof.
- Chapter 2 proves that Cinder ran Gateproof's real docs deploy workflow on a self-hosted Cinder runner.
- Chapter 3 proves that Cinder can start and report proof runs for a connected repo through its own product path.

Public artifacts:

- Historical provisioning: https://github.com/acoyfellow/cinder-round-one-end/blob/main/alchemy.run.ts
- Historical proof contract: https://github.com/acoyfellow/cinder-round-one-end/blob/main/plan.ts
- Dogfood provisioning: https://github.com/acoyfellow/cinder/blob/1cd5460/alchemy.run.ts
- Dogfood proof contract: https://github.com/acoyfellow/cinder/blob/1cd5460/plan.ts
- Proof-run chapter commit: https://github.com/acoyfellow/cinder/commit/de26df3
- Proof-run chapter contract: https://github.com/acoyfellow/cinder/blob/de26df3/plan.ts

Status: Public proof artifacts are canonical; sibling workspaces are not build inputs

The canonical witnesses for this page are the public repositories and workflow artifacts linked above. Gateproof's deployed case-study content is generated from Gateproof-owned source and public artifact links, not from a mutable sibling Cinder checkout on the runner.

## Roadmap

Gateproof is now dogfooding on Cinder through a connected-repo proof-run path. The next phase is to make that path work across more than one repo without losing proof quality.

- Preserve the historical and current chapters without rewriting their claims after publication.
- Extend the same product path from one connected repo to two connected repos.
- Keep finalize and publication tied to the last known green proof instead of ad hoc local state.
- Continue future Cinder chapters in the same case study instead of resetting the narrative.

## How To

Task: Run one complete gate from one file.

Done when: The endpoint returns 200 and the body contains hello world.

Run it:

```bash
bun run example:hello-world:worker
bun run alchemy.run.ts
bun run plan.ts
```

## Breaking Changes In 0.4.0

- `Prd.*` is gone
- `Claim.*` is gone
- `plan.ts` is the canonical entrypoint
- `Plan.*` replaces the old front door

## Reference

Files:
- `examples/hello-world/plan.ts`
- `alchemy.run.ts`
- `plan.ts`

Canonical gates:
- GET / returns hello world

Loop:
- `maxIterations: 1`
- `stopOnFailure: true`

Core API:
- `Gate.define(...)`
- `Plan.define(...)`
- `Plan.run(...)`
- `Plan.runLoop(...)`
- `Cloudflare.observe(...)`
- `Assert.hasAction(...)`
- `Assert.responseBodyIncludes(...)`
- `Assert.numericDeltaFromEnv(...)`

## Explanation

Root plan.ts stays small. Gateproof itself is built forward.
