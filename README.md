# Gateproof

> A local proof loop. Put the claim in `plan.ts`, run it, keep the system honest.

[Tutorial](https://gateproof.dev/docs/tutorials/first-gate) · [Docs](https://gateproof.dev)

## What Gateproof does

Gateproof runs a proof loop: observe the system, act on it, assert the result. If the assertions pass, the gate passes. If not, the loop iterates with a worker until it does — or the budget runs out.

Gateproof owns proof authority. It can delegate the work:

- **Built-in worker** — executes commands locally
- **filepath worker** — hands one bounded turn to a [filepath](https://github.com/acoyfellow/filepath) instance
- **Deja memory** — optionally recalls learnings before each iteration and stores new ones after

The `observe / act / assert` schema is shared with [unsurf](https://github.com/acoyfellow/unsurf) as **`proof-spec.v0`** — gateproof drives HTTP/exec; unsurf drives the DOM. Specs round-trip between them. See [proof-spec.v0 interop](#proof-specv0-interop) below.

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

## proof-spec.v0 interop

Gateproof shares its `observe / act / assert` schema with [unsurf](https://github.com/acoyfellow/unsurf) — same loop at different altitudes: gateproof drives HTTP/exec; unsurf drives the DOM. A `ProofSpec` round-trips between the two.

```ts
import {
	goalToProofSpec,
	planToProofSpecs,
	proofSpecToGoal,
	computeRisk,
	type ProofSpec,
} from "gateproof";

// Gateproof goal → publishable proof-spec (consumed by unsurf's Directory, an MCP client, etc.)
const spec = goalToProofSpec(myGoal, { url: "https://example.com/" });

// Proof-spec scouted by unsurf → runnable as a gateproof PlanGoal
const goal = proofSpecToGoal(someSpec);

// Risk is computed, not claimed. Pure function of the DSL.
computeRisk(spec.act); // "low" | "medium" | "high"
```

Types added: `ProofSpec`, `Observation`, `DslOp`, `ProofAssertion`, `EvidenceBundle`, `Risk` — see [`src/ProofSpec.ts`](./src/ProofSpec.ts). Full field reference lives in unsurf's [`experiments/_proof-spec-v0/SPEC.md`](https://github.com/acoyfellow/unsurf/blob/main/experiments/_proof-spec-v0/SPEC.md).

## Reference

- Root plan: `plan.ts`
- Example: `examples/hello-world/plan.ts`
- Worker entry: `src/index.ts`
- proof-spec types + interop: `src/ProofSpec.ts`
- [Run in a loop](https://gateproof.dev/docs/how-to/run-in-a-loop)
- [Case studies](https://gateproof.dev/case-studies)
