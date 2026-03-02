# Gateproof

Provision infrastructure once. Then let plan.ts prove the live product.

## Tutorial

Goal: Prove cinder on a live deployment, not just deploy it.

### alchemy.run.ts

```ts
import alchemy from "alchemy";
import {
  DurableObjectNamespace,
  KVNamespace,
  R2Bucket,
  Worker,
} from "alchemy/cloudflare";

const app = await alchemy("cinder", {
  stage: process.env.CINDER_STAGE ?? "production",
});

const cacheBucket = await R2Bucket("cinder-cache", {
  empty: false,
});
const runnerState = await KVNamespace("cinder-runner-state");
const runnerPool = await DurableObjectNamespace("RunnerPool", {
  className: "RunnerPool",
  sqlite: true,
});
const jobQueue = await DurableObjectNamespace("JobQueue", {
  className: "JobQueue",
  sqlite: true,
});

export const orchestrator = await Worker("cinder-orchestrator", {
  entrypoint: "./crates/cinder-orchestrator/build/worker/shim.mjs",
  bindings: {
    CACHE_BUCKET: cacheBucket,
    RUNNER_STATE: runnerState,
    RUNNER_POOL: runnerPool,
    JOB_QUEUE: jobQueue,
  },
});

await app.finalize();
```

### plan.ts

```ts
import { Effect } from "effect";
import {
  Act,
  Assert,
  Gate,
  Plan,
  Require,
  type ScopeFile,
} from "gateproof";
import { Cloudflare } from "gateproof/cloudflare";
import { orchestrator } from "./alchemy.run";

const workerLogs = Cloudflare.observe({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
  apiToken: process.env.CLOUDFLARE_API_TOKEN ?? "",
  workerName: orchestrator.name,
  sinceMs: 120_000,
});

const scope = {
  spec: {
    title: "Cinder",
    tutorial: {
      goal: "Prove cinder on a live deployment, not just deploy it.",
      outcome: "The live system only goes green when the speed claim holds.",
    },
    howTo: {
      task: "Run the proof loop against already-provisioned infrastructure.",
      done: "Webhook, queue, runner, cache, and speed all pass.",
    },
    explanation: {
      summary: "alchemy.run.ts provisions once. plan.ts proves the live product.",
    },
  },
  plan: Plan.define({
    goals: [
      {
        id: "webhook",
        title: "A GitHub webhook queues a runnable job",
        gate: Gate.define({
          observe: workerLogs,
          prerequisites: [
            Require.env("CLOUDFLARE_ACCOUNT_ID"),
            Require.env("CLOUDFLARE_API_TOKEN"),
            Require.env("GITHUB_WEBHOOK_SECRET"),
            Require.env("CINDER_INTERNAL_TOKEN"),
          ],
          act: [
            Act.exec("curl -sf -X POST $BASE/webhook/github ..."),
          ],
          assert: [
            Assert.noErrors(),
            Assert.hasAction("webhook_received"),
            Assert.hasAction("signature_verified"),
            Assert.hasAction("job_queued"),
          ],
          timeoutMs: 10_000,
        }),
      },
      {
        id: "queue",
        title: "A queued job can be dequeued",
        gate: Gate.define({
          observe: workerLogs,
          act: [Act.exec("curl -sf $BASE/jobs/next ...")],
          assert: [
            Assert.noErrors(),
            Assert.hasAction("job_dequeued"),
            Assert.responseBodyIncludes("run_id"),
          ],
        }),
      },
      {
        id: "runner",
        title: "A runner can register into the pool",
        gate: Gate.define({
          observe: workerLogs,
          act: [Act.exec("curl -sf -X POST $BASE/runners/register ...")],
          assert: [
            Assert.noErrors(),
            Assert.hasAction("runner_registered"),
            Assert.hasAction("runner_pool_updated"),
          ],
        }),
      },
      {
        id: "cache-restore",
        title: "A missing cache key returns a clean miss",
        gate: Gate.define({
          observe: workerLogs,
          act: [Act.exec("curl -sf -X POST $BASE/cache/restore/$KEY ...")],
          assert: [
            Assert.noErrors(),
            Assert.hasAction("cache_miss"),
          ],
        }),
      },
      {
        id: "cache-push",
        title: "The cache upload path returns a usable upload URL",
        gate: Gate.define({
          observe: workerLogs,
          act: [Act.exec("curl -sf -X POST $BASE/cache/upload ...")],
          assert: [
            Assert.noErrors(),
            Assert.hasAction("upload_url_generated"),
            Assert.responseBodyIncludes("http"),
          ],
        }),
      },
      {
        id: "speed-claim",
        title: "A warm build is materially faster than cold",
        gate: Gate.define({
          observe: workerLogs,
          prerequisites: [
            Require.env("COLD_BUILD_MS"),
            Require.env("TEST_REPO"),
          ],
          act: [Act.exec("curl -sf -X POST http://localhost:9000/test/run ...")],
          assert: [
            Assert.noErrors(),
            Assert.hasAction("build_complete"),
            Assert.numericDeltaFromEnv({
              source: "logMessage",
              pattern: "build_duration_ms=(\\d+)",
              baselineEnv: "COLD_BUILD_MS",
              minimumDelta: 60_000,
            }),
          ],
          timeoutMs: 120_000,
        }),
      },
    ],
    loop: {
      maxIterations: 1,
      stopOnFailure: true,
    },
    cleanup: {
      actions: [
        Act.exec("curl -sf -X DELETE $BASE/runners/plan-test-runner ..."),
      ],
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

Outcome: Webhook intake, queueing, runner registration, cache paths, and the speed claim all go green.

## How To

Task: Provision infrastructure once. Then let plan.ts prove the live product.

Done when: Gateproof only goes green when the live system can do the work and the product claim holds.

Run it:

```bash
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
- `alchemy.run.ts`
- `plan.ts`

Canonical gates:
- A GitHub webhook queues a runnable job
- A queued job can be dequeued
- A runner can register into the pool
- A missing cache key returns a clean miss
- The cache upload path returns a usable upload URL
- A warm build is materially faster than cold

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

alchemy.run.ts provisions once. plan.ts reruns the proof loop against the live deployment.
