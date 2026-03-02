import { Effect } from "effect";
import { Cloudflare } from "./src/cloudflare/index";
import type { ScopeFile } from "./src/index";
import {
  Act,
  Assert,
  Gate,
  Plan,
  Require,
} from "./src/index";

const baseUrl = process.env.CINDER_BASE_URL ?? "https://example.invalid";
const workerName = process.env.CINDER_WORKER_NAME ?? "cinder-orchestrator";
const speedThresholdMs = Number(process.env.SPEED_THRESHOLD_MS ?? "60000");

const workerLogs = Cloudflare.observe({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
  apiToken: process.env.CLOUDFLARE_API_TOKEN ?? "",
  workerName,
  sinceMs: 120_000,
  pollInterval: 1_000,
});

const scope = {
  spec: {
    title: "Gateproof",
    tutorial: {
      goal: "Prove cinder on a live deployment, not just deploy it.",
      outcome:
        "Webhook intake, queueing, runner registration, cache paths, and the speed claim all go green.",
    },
    howTo: {
      task: "Provision infrastructure once. Then let plan.ts prove the live product.",
      done:
        "Gateproof only goes green when the live system can do the work and the product claim holds.",
    },
    explanation: {
      summary:
        "alchemy.run.ts provisions once. plan.ts reruns the proof loop against the live deployment.",
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
            Require.env("CINDER_BASE_URL"),
            Require.env("CLOUDFLARE_ACCOUNT_ID"),
            Require.env("CLOUDFLARE_API_TOKEN"),
          ],
          act: [
            Act.exec(
              `curl -sf -X POST ${baseUrl}/webhook/github -H "Content-Type: application/json" -d '{"example":true}'`,
            ),
          ],
          assert: [
            Assert.noErrors(),
            Assert.hasAction("webhook_received"),
            Assert.hasAction("job_queued"),
          ],
        }),
      },
      {
        id: "queue",
        title: "A queued job can be dequeued",
        gate: Gate.define({
          observe: workerLogs,
          prerequisites: [
            Require.env("CINDER_BASE_URL"),
            Require.env("CLOUDFLARE_ACCOUNT_ID"),
            Require.env("CLOUDFLARE_API_TOKEN"),
            Require.env("CINDER_INTERNAL_TOKEN"),
          ],
          act: [
            Act.exec(
              `curl -sf ${baseUrl}/jobs/next -H "Authorization: Bearer $CINDER_INTERNAL_TOKEN"`,
            ),
          ],
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
          prerequisites: [
            Require.env("CINDER_BASE_URL"),
            Require.env("CLOUDFLARE_ACCOUNT_ID"),
            Require.env("CLOUDFLARE_API_TOKEN"),
            Require.env("CINDER_INTERNAL_TOKEN"),
          ],
          act: [
            Act.exec(
              `curl -sf -X POST ${baseUrl}/runners/register -H "Content-Type: application/json" -H "Authorization: Bearer $CINDER_INTERNAL_TOKEN" -d '{"runner_id":"plan-test-runner"}'`,
            ),
          ],
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
          prerequisites: [
            Require.env("CINDER_BASE_URL"),
            Require.env("CLOUDFLARE_ACCOUNT_ID"),
            Require.env("CLOUDFLARE_API_TOKEN"),
            Require.env("CINDER_INTERNAL_TOKEN"),
          ],
          act: [
            Act.exec(
              `curl -sf -X POST ${baseUrl}/cache/restore/example-key -H "Authorization: Bearer $CINDER_INTERNAL_TOKEN"`,
            ),
          ],
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
          prerequisites: [
            Require.env("CINDER_BASE_URL"),
            Require.env("CLOUDFLARE_ACCOUNT_ID"),
            Require.env("CLOUDFLARE_API_TOKEN"),
            Require.env("CINDER_INTERNAL_TOKEN"),
          ],
          act: [
            Act.exec(
              `curl -sf -X POST ${baseUrl}/cache/upload -H "Content-Type: application/json" -H "Authorization: Bearer $CINDER_INTERNAL_TOKEN" -d '{"key":"example-key","content_type":"application/x-tar","size_bytes":1024}'`,
            ),
          ],
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
            Require.env("CLOUDFLARE_ACCOUNT_ID"),
            Require.env("CLOUDFLARE_API_TOKEN"),
            Require.env("COLD_BUILD_MS"),
            Require.env("TEST_REPO"),
          ],
          act: [
            Act.exec(
              `curl -sf -X POST http://localhost:9000/test/run -H "Content-Type: application/json" -d '{"repo":"$TEST_REPO","with_cache":true}'`,
            ),
          ],
          assert: [
            Assert.noErrors(),
            Assert.hasAction("build_complete"),
            Assert.numericDeltaFromEnv({
              source: "logMessage",
              pattern: "build_duration_ms=(\\\\d+)",
              baselineEnv: "COLD_BUILD_MS",
              minimumDelta: speedThresholdMs,
            }),
          ],
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
          `if [ -n "$CINDER_INTERNAL_TOKEN" ]; then curl -sf -X DELETE ${baseUrl}/runners/plan-test-runner -H "Authorization: Bearer $CINDER_INTERNAL_TOKEN" >/dev/null; else exit 0; fi`,
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
