# Reference: API

Everything here is exported from `gateproof`, except `Cloudflare`, which is exported from `gateproof/cloudflare`. This page describes version 0.6.0 on `main`.

## Plan

| Function | Returns | Purpose |
| --- | --- | --- |
| `Plan.define(plan)` | `PlanDefinition` | Checks `dependsOn` and returns the plan. Throws on bad dependencies. |
| `Plan.run(plan)` | `Effect<PlanRunResult>` | Evaluates every story once. A story blocked by `dependsOn` fails without running its gate. Then runs the cleanup actions. |
| `Plan.runLoop(plan, options?)` | `Effect<PlanRunResult>` | Runs, hands the first failing story to a worker, and repeats. |

```ts
interface PlanDefinition {
  stories: PlanStory[];
  loop?: { maxIterations?: number; stopOnFailure?: boolean };
  cleanup?: { actions: ActionDefinition[] };
}

interface PlanStory {
  id: string;
  title: string;
  gate: GateDefinition;
  scope?: PlanScope;
  dependsOn?: string[];
}

interface PlanScope {
  allowedPaths?: string[];
  forbiddenPaths?: string[];
  maxChangedFiles?: number;
  maxChangedLines?: number;
}
```

## Gate

```ts
Gate.define({
  observe?: ObserveResourceDefinition,
  act?: ActionDefinition[],
  assert?: AssertionDefinition[],
  prerequisites?: PrerequisiteDefinition[],
  timeoutMs?: number,
})
```

## Observe

| Function | Watches |
| --- | --- |
| `createHttpObserveResource({ url, headers?, pollInterval? })` | One HTTP endpoint. |
| `Cloudflare.observe({ accountId, apiToken, workerName, backend?, sinceMs?, pollInterval? })` | Workers Logs for one Worker. `backend` defaults to `"workers-logs"`. |

## Act

| Function | Does |
| --- | --- |
| `Act.exec(command, { cwd?, timeoutMs? })` | Runs one shell command. |

## Assert

| Function | Passes when |
| --- | --- |
| `Assert.httpResponse({ status, actionIncludes? })` | The observed HTTP response has this status. |
| `Assert.responseBodyIncludes(text)` | The observed body contains `text`. With no HTTP body, Gateproof uses the action stdout. With neither, the story is `inconclusive`. |
| `Assert.noErrors()` | The run collected no errors. |
| `Assert.hasAction(action)` | A log event names this action. With no logs, the story is `inconclusive`. |
| `Assert.duration({ atMostMs, actionIncludes? })` | The HTTP observation took at most `atMostMs`. With no HTTP observation, the story is `inconclusive`. |
| `Assert.numericDeltaFromEnv({ source, pattern, baselineEnv, minimumDelta })` | `baseline - measured >= minimumDelta`. The measured number must fall by at least `minimumDelta` from the baseline env var. A missing baseline or a missing number gives `inconclusive`. A non-numeric baseline gives `fail`. |

`actionIncludes` is a guard for `httpResponse` and `duration`. The observe URL or an `act` command must contain this text. If none does, the story is `inconclusive`.

## Require

| Function | Passes when |
| --- | --- |
| `Require.env(name, reason?)` | The environment variable is set and not empty. If not, the story is `fail`. The summary lists each `reason`, or `missing required env var NAME`. |

## Loop options

```ts
Plan.runLoop(plan, {
  maxIterations?: number,
  worker?: LoopWorker,
  cwd?: string,
  planPath?: string,
  workerTimeoutMs?: number,
  commit?: { enabled?: boolean; allowEmpty?: boolean },
  onIteration?: (status) => void,
  memory?: MemoryRuntime,
  rerunFailedStoryPrefix?: boolean,
})
```

## Workers and memory

| Function | Purpose |
| --- | --- |
| `createOpenCodeWorker({ model?, apiKey?, endpoint?, maxSteps?, timeoutMs?, prompt? })` | Built-in worker. |
| `createFilepathWorker({ endpoint, workspaceId, harnessId, model, apiKey?, timeoutMs? })` | One bounded turn on filepath. Alpha. |
| `createDejaMemoryRuntime({ endpoint, scope, apiKey?, recallLimit?, updatedBy? })` | Recall and store learnings in Deja. |

## proof-spec.v0

| Function | Purpose |
| --- | --- |
| `planToProofSpecs(plan, targetFor)` | One `ProofSpec` per story. |
| `goalToProofSpec(story, target)` | One story to one spec. |
| `proofSpecToGoal(spec)` | One spec to one story. |
| `computeRisk(act)` | Risk level of a list of actions. |

See [proof-spec.v0](/docs/explanations/proof-spec).

## Results

| Status | Meaning |
| --- | --- |
| `pass` | Every assertion held. |
| `fail` | An assertion did not hold, a required env var is missing, or a story in `dependsOn` ran earlier in the same pass and did not pass. |
| `inconclusive` | Evidence was missing. |
| `skip` | Reserved. The type allows it, but no story produces it today. |

Plan status, in order: no stories gives `inconclusive`. All stories `skip` gives `skip`. Any `inconclusive` gives `inconclusive`. Any `fail` gives `fail`. Otherwise `pass`.

## Commands in the repository

```bash
bun run example:hello-world                 # one story, local server
bun run example:hello-world:worker          # loop with the built-in worker
bun run example:hello-world:filepath-worker # loop with the filepath worker
bun run example:hello-theorem               # Lean gate
bun run prove:once                          # root plan, starts the server
```
