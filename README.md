# Gateproof

Gateproof is a local proof loop. Put the claim in `plan.ts`, run it, and keep the system honest.

Docs live on the website:

- [Tutorial](https://gateproof.dev/docs/tutorials/first-gate)
- [Run in a loop](https://gateproof.dev/docs/how-to/run-in-a-loop)
- [Use the filepath worker alpha](https://gateproof.dev/docs/how-to/use-the-filepath-worker-alpha)
- [Case studies](https://gateproof.dev/case-studies)

## Start Small

Start with one gate that is deliberately tiny and complete.

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

## Worker Paths

- `bun run example:hello-world:worker` — stable built-in worker demo path
- `bun run example:hello-world:filepath-worker` — real filepath-backed hello-world witness; not the default public worker path

The filepath path is documented on the site, not in a standalone markdown note:

- [Use the filepath Worker Alpha](https://gateproof.dev/docs/how-to/use-the-filepath-worker-alpha)

## Case Study: Cinder

Cinder is a CI runner built on Cloudflare. This case study has three earned chapters, and the current truth is simple: Cloudflare hosts the control plane, a separate machine still handles compute, and hosted execution is next.

- [Case study page](https://gateproof.dev/case-studies/cinder)
- Historical provisioning: https://github.com/acoyfellow/cinder-round-one-end/blob/main/alchemy.run.ts
- Historical proof contract: https://github.com/acoyfellow/cinder-round-one-end/blob/main/plan.ts
- Dogfood provisioning: https://github.com/acoyfellow/cinder/blob/1cd5460/alchemy.run.ts
- Dogfood proof contract: https://github.com/acoyfellow/cinder/blob/1cd5460/plan.ts
- Proof-run chapter commit: https://github.com/acoyfellow/cinder/commit/de26df3
- Proof-run chapter contract: https://github.com/acoyfellow/cinder/blob/de26df3/plan.ts

Status: This page is built from public proof links, not a local Cinder checkout

This page is built from Gateproof-owned source and the public repo and workflow links above. It does not read a nearby Cinder checkout at deploy time, so the public page stays stable and reproducible.

## Run It

Smallest commands:

```bash
bun run example:hello-world
bun run example:hello-world:worker
bun run example:hello-world:filepath-worker
bun run plan.ts
```

## Reference

Files:
- `examples/hello-world/plan.ts`
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
