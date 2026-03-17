# Gateproof

> A local proof loop. Put the claim in `plan.ts`, run it, keep the system honest.

[Tutorial](https://gateproof.dev/docs/tutorials/first-gate) · [Docs](https://gateproof.dev)

## What Gateproof does

Gateproof runs a proof loop: observe the system, act on it, assert the result. If the assertions pass, the gate passes. If not, the loop iterates with a worker until it does — or the budget runs out.

Gateproof owns proof authority. It can delegate the work:

- **Built-in worker** — executes commands locally
- **filepath worker** — hands one bounded turn to a [filepath](https://github.com/acoyfellow/filepath) instance
- **Deja memory** — optionally recalls learnings before each iteration and stores new ones after

## Quickstart

```bash
bun install
bun run example:hello-world
```

### Smallest gate

```ts
import { Effect } from "effect";
import {
  Act,
  Assert,
  Gate,
  Plan,
  createHttpObserveResource,
} from "gateproof";

const scope = {
  plan: Plan.define({
    goals: [
      {
        id: "hello-world",
        title: "GET / returns hello world",
        gate: Gate.define({
          observe: createHttpObserveResource({ url: "http://localhost:3000/" }),
          act: [Act.exec("curl -sf http://localhost:3000/")],
          assert: [
            Assert.httpResponse({ status: 200 }),
            Assert.responseBodyIncludes("hello world"),
            Assert.noErrors(),
          ],
        }),
      },
    ],
    loop: { maxIterations: 1, stopOnFailure: true },
  }),
};

const result = await Effect.runPromise(Plan.runLoop(scope.plan));
if (result.status !== "pass") process.exitCode = 1;
```

## Run it

```bash
bun run example:hello-world                    # basic proof loop
bun run example:hello-world:worker             # with built-in worker
bun run example:hello-world:filepath-worker    # with filepath worker
bun run plan.ts                                # run the root plan
```

## Worker paths

- **Built-in worker** — runs commands directly, no external dependencies
- **filepath worker** — calls `POST /api/workspaces/:id/run` on a filepath instance; documented at [Use the filepath Worker](https://gateproof.dev/docs/how-to/use-the-filepath-worker-alpha)
- **Deja memory** — attach with `createDejaMemoryRuntime`; recalls before each iteration, learns after

## Core API

```ts
Gate.define({ observe, act, assert })
Plan.define({ goals, loop })
Plan.run(plan)
Plan.runLoop(plan)
createHttpObserveResource({ url })
createFilepathWorker({ ... })
createDejaMemoryRuntime({ ... })
Act.exec(command)
Assert.httpResponse({ status })
Assert.responseBodyIncludes(text)
Assert.hasAction(id)
Assert.noErrors()
Assert.numericDeltaFromEnv(key, threshold)
Require.env(key)
```

## Reference

- Root plan: `plan.ts`
- Example: `examples/hello-world/plan.ts`
- Worker entry: `src/index.ts`
- [Run in a loop](https://gateproof.dev/docs/how-to/run-in-a-loop)
- [Case studies](https://gateproof.dev/case-studies)
