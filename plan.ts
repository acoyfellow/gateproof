import { Effect } from "effect";
import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { Cloudflare } from "./src/cloudflare/index";
import type { ScopeFile } from "./src/index";
import {
  Act,
  Assert,
  Gate,
  Plan,
  Require,
} from "./src/index";

type RuntimeState = {
  orchestratorName?: string;
  orchestratorUrl?: string;
};

type FallbackEnv = Record<string, string>;

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
  const runtimeFile = new URL("../cinder/.gateproof/runtime.json", import.meta.url);

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

function loadFallbackEnv(): FallbackEnv {
  const envFile = new URL("../cinder/.env", import.meta.url);

  if (!existsSync(envFile)) {
    return {};
  }

  try {
    const entries = readFileSync(envFile, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        if (separatorIndex < 1) {
          return null;
        }

        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();

        return key.length > 0 ? [key, value] as const : null;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null);

    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

const runtimeState = loadRuntimeState();
const fallbackEnv = loadFallbackEnv();

function readConfiguredEnv(name: string): string | undefined {
  return readOptionalEnv(name) ?? fallbackEnv[name];
}

const baseUrl =
  readConfiguredEnv("CINDER_BASE_URL") ??
  runtimeState?.orchestratorUrl ??
  "https://example.invalid";
const workerName =
  readConfiguredEnv("CINDER_WORKER_NAME") ??
  runtimeState?.orchestratorName ??
  "cinder-orchestrator";
const webhookSecret = readConfiguredEnv("GITHUB_WEBHOOK_SECRET") ?? "";
const speedThresholdMs = Number(readConfiguredEnv("SPEED_THRESHOLD_MS") ?? "60000");

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
    name: "gateproof-plan-test",
    labels: ["self-hosted", "cinder"],
  },
  repository: {
    full_name: "acoyfellow/cinder-prd-test",
  },
});

for (const [name, value] of Object.entries(fallbackEnv)) {
  if (!process.env[name] && value.length > 0) {
    process.env[name] = value;
  }
}

if (!process.env.CINDER_BASE_URL && runtimeState?.orchestratorUrl) {
  process.env.CINDER_BASE_URL = runtimeState.orchestratorUrl;
}

if (!process.env.CINDER_WORKER_NAME && runtimeState?.orchestratorName) {
  process.env.CINDER_WORKER_NAME = runtimeState.orchestratorName;
}

const workerLogs = Cloudflare.observe({
  accountId: readConfiguredEnv("CLOUDFLARE_ACCOUNT_ID") ?? "",
  apiToken: readConfiguredEnv("CLOUDFLARE_API_TOKEN") ?? "",
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
            Require.env("GITHUB_WEBHOOK_SECRET"),
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
              pattern: "build_duration_ms=(\\d+)",
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
