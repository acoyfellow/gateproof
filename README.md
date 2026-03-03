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

### alchemy.run.ts

```ts
import alchemy from "alchemy";
import { mkdir } from "node:fs/promises";
import {
  DurableObjectNamespace,
  KVNamespace,
  R2Bucket,
  Worker,
} from "alchemy/cloudflare";

export const app = await alchemy("cinder", {
  stage: process.env.CINDER_STAGE ?? "production",
});

export const cacheBucket = await R2Bucket("cinder-cache", {
  empty: false,
});

export const runnerState = await KVNamespace("cinder-runner-state");

export const runnerPool = await DurableObjectNamespace("RunnerPool", {
  className: "RunnerPool",
  sqlite: true,
});

export const jobQueue = await DurableObjectNamespace("JobQueue", {
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
    GITHUB_WEBHOOK_SECRET: alchemy.secret(process.env.GITHUB_WEBHOOK_SECRET!),
    CINDER_INTERNAL_TOKEN: alchemy.secret(process.env.CINDER_INTERNAL_TOKEN!),
  },
});

export const cacheWorker = await Worker("cinder-cache-worker", {
  entrypoint: "./crates/cinder-cache/build/worker/shim.mjs",
  bindings: {
    CACHE_BUCKET: cacheBucket,
    CINDER_INTERNAL_TOKEN: alchemy.secret(process.env.CINDER_INTERNAL_TOKEN!),
  },
});

await app.finalize();

const runtimeDirectory = new URL("./.gateproof/", import.meta.url);
const runtimeFile = new URL("./.gateproof/runtime.json", import.meta.url);

await mkdir(runtimeDirectory, { recursive: true });

await Bun.write(
  runtimeFile,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      stage: process.env.CINDER_STAGE ?? "production",
      orchestratorName: orchestrator.name,
      orchestratorUrl: orchestrator.url,
      cacheWorkerName: cacheWorker.name,
      cacheWorkerUrl: cacheWorker.url,
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote runtime outputs to ${runtimeFile.pathname}`);
```

### plan.ts

```ts
import { Effect } from "effect";
import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import type { ScopeFile } from "gateproof";
import {
  Act,
  Assert,
  Gate,
  Plan,
  Require,
} from "gateproof";
import { Cloudflare } from "gateproof/cloudflare";

type RuntimeState = {
  orchestratorName?: string;
  orchestratorUrl?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function loadRuntimeState(): RuntimeState | null {
  const runtimeFile = new URL("./.gateproof/runtime.json", import.meta.url);

  if (!existsSync(runtimeFile)) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(readFileSync(runtimeFile, "utf8"));
    if (!isRecord(parsed)) {
      return null;
    }

    return {
      orchestratorName:
        typeof parsed.orchestratorName === "string" ? parsed.orchestratorName : undefined,
      orchestratorUrl:
        typeof parsed.orchestratorUrl === "string" ? parsed.orchestratorUrl : undefined,
    };
  } catch {
    return null;
  }
}

const runtimeState = loadRuntimeState();
const baseUrl = readOptionalEnv("CINDER_BASE_URL") ?? runtimeState?.orchestratorUrl ?? "";
const workerName =
  readOptionalEnv("CINDER_WORKER_NAME") ?? runtimeState?.orchestratorName ?? "cinder-orchestrator";
const internalToken = readOptionalEnv("CINDER_INTERNAL_TOKEN") ?? "";
const webhookSecret = readOptionalEnv("GITHUB_WEBHOOK_SECRET") ?? "";

const missKey = crypto.randomBytes(32).toString("hex");
const newKey = crypto.randomBytes(32).toString("hex");
const speedThresholdMs = Number(process.env.SPEED_THRESHOLD_MS ?? "60000");
const testRepo = process.env.TEST_REPO ?? "";

function githubSignature(payload: string, secret: string): string {
  return (
    "sha256=" +
    crypto.createHmac("sha256", secret).update(payload).digest("hex")
  );
}

const webhookPayload = JSON.stringify({
  action: "queued",
  workflow_job: {
    id: 99991,
    run_id: 99991,
    name: "cinder-plan-test",
    labels: ["self-hosted", "cinder"],
  },
  repository: {
    full_name: "acoyfellow/cinder-prd-test",
  },
});

const workerLogs = Cloudflare.observe({
  accountId: readOptionalEnv("CLOUDFLARE_ACCOUNT_ID") ?? "",
  apiToken: readOptionalEnv("CLOUDFLARE_API_TOKEN") ?? "",
  workerName,
  sinceMs: 120_000,
  pollInterval: 1_000,
});

if (!process.env.CINDER_BASE_URL && baseUrl) {
  process.env.CINDER_BASE_URL = baseUrl;
}

if (!process.env.CINDER_WORKER_NAME && workerName) {
  process.env.CINDER_WORKER_NAME = workerName;
}

const scope = {
  spec: {
    title: "Cinder",
    tutorial: {
      goal: "Prove cinder on a live deployment, not just deploy it.",
      outcome:
        "Webhook intake, queueing, runner registration, cache paths, and the speed claim all go green.",
    },
    howTo: {
      task: "Run the cinder proof loop against already-provisioned infrastructure.",
      done:
        "Cinder only exits green when the live system can do the work and the speed claim holds.",
    },
    explanation: {
      summary:
        "alchemy.run.ts creates the infrastructure once and writes .gateproof/runtime.json. This file is only the acceptance loop for the live product.",
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
            Require.env(
              "CLOUDFLARE_ACCOUNT_ID",
              "CLOUDFLARE_ACCOUNT_ID is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CLOUDFLARE_API_TOKEN",
              "CLOUDFLARE_API_TOKEN is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "GITHUB_WEBHOOK_SECRET",
              "GITHUB_WEBHOOK_SECRET is required for webhook verification.",
            ),
            Require.env(
              "CINDER_INTERNAL_TOKEN",
              "CINDER_INTERNAL_TOKEN is required for internal API access.",
            ),
            Require.env(
              "CINDER_BASE_URL",
              "Run bun run provision first or set CINDER_BASE_URL to the live orchestrator URL.",
            ),
          ],
          act: [
            Act.exec(
              `curl -sf -X POST ${baseUrl}/webhook/github \
                -H "Content-Type: application/json" \
                -H "X-Hub-Signature-256: ${githubSignature(webhookPayload, webhookSecret)}" \
                -d '${webhookPayload}'`,
            ),
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
          prerequisites: [
            Require.env(
              "CLOUDFLARE_ACCOUNT_ID",
              "CLOUDFLARE_ACCOUNT_ID is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CLOUDFLARE_API_TOKEN",
              "CLOUDFLARE_API_TOKEN is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CINDER_INTERNAL_TOKEN",
              "CINDER_INTERNAL_TOKEN is required for queue inspection.",
            ),
            Require.env(
              "CINDER_BASE_URL",
              "Run bun run provision first or set CINDER_BASE_URL to the live orchestrator URL.",
            ),
          ],
          act: [
            Act.exec(
              `curl -sf ${baseUrl}/jobs/next \
                -H "Authorization: Bearer ${internalToken}"`,
            ),
          ],
          assert: [
            Assert.noErrors(),
            Assert.hasAction("job_dequeued"),
            Assert.responseBodyIncludes("run_id"),
            Assert.responseBodyIncludes("labels"),
          ],
          timeoutMs: 8_000,
        }),
      },
      {
        id: "runner",
        title: "A runner can register into the pool",
        gate: Gate.define({
          observe: workerLogs,
          prerequisites: [
            Require.env(
              "CLOUDFLARE_ACCOUNT_ID",
              "CLOUDFLARE_ACCOUNT_ID is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CLOUDFLARE_API_TOKEN",
              "CLOUDFLARE_API_TOKEN is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CINDER_INTERNAL_TOKEN",
              "CINDER_INTERNAL_TOKEN is required for runner registration.",
            ),
            Require.env(
              "CINDER_BASE_URL",
              "Run bun run provision first or set CINDER_BASE_URL to the live orchestrator URL.",
            ),
          ],
          act: [
            Act.exec(
              `curl -sf -X POST ${baseUrl}/runners/register \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer ${internalToken}" \
                -d '{"runner_id":"plan-test-runner","labels":["self-hosted","cinder"],"arch":"x86_64"}'`,
            ),
          ],
          assert: [
            Assert.noErrors(),
            Assert.hasAction("runner_registered"),
            Assert.hasAction("runner_pool_updated"),
          ],
          timeoutMs: 8_000,
        }),
      },
      {
        id: "cache-restore",
        title: "A missing cache key returns a clean miss",
        gate: Gate.define({
          observe: workerLogs,
          prerequisites: [
            Require.env(
              "CLOUDFLARE_ACCOUNT_ID",
              "CLOUDFLARE_ACCOUNT_ID is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CLOUDFLARE_API_TOKEN",
              "CLOUDFLARE_API_TOKEN is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CINDER_INTERNAL_TOKEN",
              "CINDER_INTERNAL_TOKEN is required for cache restore.",
            ),
            Require.env(
              "CINDER_BASE_URL",
              "Run bun run provision first or set CINDER_BASE_URL to the live orchestrator URL.",
            ),
          ],
          act: [
            Act.exec(
              `curl -sf -X POST ${baseUrl}/cache/restore/${missKey} \
                -H "Authorization: Bearer ${internalToken}"`,
            ),
          ],
          assert: [
            Assert.noErrors(),
            Assert.hasAction("cache_miss"),
          ],
          timeoutMs: 5_000,
        }),
      },
      {
        id: "cache-push",
        title: "The cache upload path returns a usable upload URL",
        gate: Gate.define({
          observe: workerLogs,
          prerequisites: [
            Require.env(
              "CLOUDFLARE_ACCOUNT_ID",
              "CLOUDFLARE_ACCOUNT_ID is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CLOUDFLARE_API_TOKEN",
              "CLOUDFLARE_API_TOKEN is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CINDER_INTERNAL_TOKEN",
              "CINDER_INTERNAL_TOKEN is required for cache upload.",
            ),
            Require.env(
              "CINDER_BASE_URL",
              "Run bun run provision first or set CINDER_BASE_URL to the live orchestrator URL.",
            ),
          ],
          act: [
            Act.exec(
              `curl -sf -X POST ${baseUrl}/cache/upload \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer ${internalToken}" \
                -d '{"key":"${newKey}","content_type":"application/x-tar","size_bytes":1024}'`,
            ),
          ],
          assert: [
            Assert.noErrors(),
            Assert.hasAction("upload_url_generated"),
            Assert.responseBodyIncludes("http"),
          ],
          timeoutMs: 8_000,
        }),
      },
      {
        id: "speed-claim",
        title: "A warm build is materially faster than cold",
        gate: Gate.define({
          observe: workerLogs,
          prerequisites: [
            Require.env(
              "CLOUDFLARE_ACCOUNT_ID",
              "CLOUDFLARE_ACCOUNT_ID is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CLOUDFLARE_API_TOKEN",
              "CLOUDFLARE_API_TOKEN is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "COLD_BUILD_MS",
              "Set COLD_BUILD_MS to a real cold baseline in milliseconds.",
            ),
            Require.env(
              "TEST_REPO",
              "Set TEST_REPO to a real repository for the speed claim.",
            ),
          ],
          act: [
            Act.exec(
              `curl -sf -X POST http://localhost:9000/test/run \
                -H "Content-Type: application/json" \
                -d '{"repo":"${testRepo}","with_cache":true}'`,
            ),
          ],
          assert: [
            Assert.noErrors(),
            Assert.hasAction("build_complete"),
            Assert.numericDeltaFromEnv({
              source: "logMessage",
              pattern: "build_duration_ms=(\\d+)",
              baselineEnv: "COLD_BUILD_MS",
              minimumDelta: speedThresholdMs,
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
        Act.exec(
          `if [ -n "${internalToken}" ] && [ -n "${baseUrl}" ]; then curl -sf -X DELETE ${baseUrl}/runners/plan-test-runner -H "Authorization: Bearer ${internalToken}" >/dev/null; else exit 0; fi`,
        ),
      ],
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
```

Status: Structurally ready

Typechecked against the local Gateproof package. Running it end-to-end still requires live Cloudflare infrastructure and the real Cinder environment variables.

## How To

Task: Provision infrastructure once. Then let plan.ts prove the live product.

Done when: Gateproof only goes green when the live system can do the work and the product claim holds.

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
