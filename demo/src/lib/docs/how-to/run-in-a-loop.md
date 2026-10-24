# How To: Run in a Loop

**Task:** give a failing story to a worker until the gate passes or the budget ends.

**Done when:** `Plan.runLoop` returns `status: "pass"`.

## Steps

1. Optional: run the root `plan.ts` once to see a single pass. The script starts the hello-world server for you:

   ```bash
   bun run prove:once
   ```

2. Run the loop with the built-in worker:

   ```bash
   bun run example:hello-world:worker
   ```

   This example needs no API key. It starts a local fake model server that returns a fixed fix, so you can see the loop work offline. In your own plan, pass a real model `endpoint` to `createOpenCodeWorker`. With no `endpoint`, the worker makes no change.

3. Read the result. Each iteration reports the story, the worker summary, and the new status.

## How the loop works

```ts
import { Effect } from "effect";
import { Plan, createOpenCodeWorker } from "gateproof";

await Effect.runPromise(
  Plan.runLoop(plan, {
    maxIterations: 3,
    worker: createOpenCodeWorker({ endpoint: process.env.MODEL_ENDPOINT }),
  }),
);
```

On each iteration, Gateproof:

1. Runs the stories in order. With `rerunFailedStoryPrefix: true`, later iterations run only the stories up to and including the first story that failed.
2. Stops when the plan status is `pass` or `skip`, when there is no worker, or when `maxIterations` is reached. With no worker and `loop.stopOnFailure: true`, a `fail` also stops it.
3. Sends the **first failing story** to the worker.
4. Checks the worker's changes against the story's `scope`.
5. Rejects a change outside scope. The loop records a scope violation, not a pass.
6. Runs the plan again.

## Scope

A story can limit what the worker may change:

```ts
scope: {
  allowedPaths: ["examples/hello-world/"],
  forbiddenPaths: ["plan.ts"],
  maxChangedFiles: 2,
  maxChangedLines: 50,
}
```

With no `scope`, these defaults apply:

- **Allowed:** `src/`, `app/`, `components/`, `pages/`, `lib/`
- **Forbidden:** `node_modules/`, `.git/`, `dist/`, `build/`, `.env`, `plan.ts`, `README.md`, `demo/src/routes/case-studies/`

`plan.ts` is forbidden by default. The worker cannot weaken the proof to pass it.

## Story order with dependsOn

A story can wait for earlier stories:

```ts
{ id: "user-login", title: "User can log in", dependsOn: ["user-signup"], gate }
```

If `user-signup` ran and its status is anything other than `pass`, `user-login` gets `fail` with the summary `upstream story 'user-signup' failed`. Its gate does not run. `Plan.define` throws on cycles, forward references, unknown ids, duplicate ids, and self-references.

## Worker choices

| Worker | Use |
| --- | --- |
| `createOpenCodeWorker` | Built-in path. Stable. |
| `createFilepathWorker` | Alpha. One bounded turn on [filepath](/docs/how-to/use-the-filepath-worker-alpha). |
| Your own function | Any `(context) => Effect<WorkerResult>`. |

In every case, Gateproof keeps the proof. The worker only proposes changes.
