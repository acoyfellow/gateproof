# How To: Add Deja Memory

**Task:** let each loop iteration recall what earlier runs learned.

**Done when:** the worker context has a `recall` field with learnings from Deja.

## What memory does

Memory is optional. It does not change pass or fail. Only the gate decides that.

With a memory runtime, `Plan.runLoop`:

1. **Before** each iteration, asks memory for learnings about the failing story. The worker gets them as `context.recall`.
2. **After** each iteration, writes what happened: the failing story, the worker summary, the changes, and the commit.
3. Keeps a working state for the proof run, and resolves it when the plan passes.

## Use Deja

```ts
import { Effect } from "effect";
import { Plan, createDejaMemoryRuntime } from "gateproof";

await Effect.runPromise(
  Plan.runLoop(plan, {
    worker,
    memory: createDejaMemoryRuntime({
      endpoint: "https://your-deja-instance.example",
      scope: "gateproof:my-project",
      apiKey: process.env.DEJA_API_KEY,
      recallLimit: 5,
    }),
  }),
);
```

Options:

| Option | Required | Meaning |
| --- | --- | --- |
| `endpoint` | yes | Base URL of the Deja instance. |
| `scope` | yes | Memory scope for this project. |
| `apiKey` | no | Sent as a bearer token. |
| `recallLimit` | no | Maximum learnings to recall. Default `4`. |
| `updatedBy` | no | Name written with each state update. Default `"gateproof"`. |

Gateproof calls `/inject`, `/learn`, `/state/:proofRunId`, and `/state/:proofRunId/resolve` on the endpoint.

## Failure behavior

Recall and the working-state calls need a `proofRunId`. Without one, recall returns nothing and the state calls are skipped.

A memory error never fails the run. If Deja is down, recall returns nothing and writes are skipped. The proof loop continues.

## Write your own memory

`memory` accepts any `MemoryRuntime`. Only `writeIteration` is required. `recallIteration`, `updateWorkingState`, and `resolveWorkingState` are optional.
