import type { ScopeFile } from "../src/index";

export interface RenderReadmeOptions {
  fileName?: string;
  runCommand?: string;
}

export interface FrontdoorContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  provisionLabel: string;
  provisionCode: string;
  planLabel: string;
  planCode: string;
  support: ReadonlyArray<string>;
}

const cinderProvisionSnippet = `import alchemy from "alchemy";
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

await app.finalize();`;

const cinderPlanSnippet = `import { Effect } from "effect";
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
              pattern: "build_duration_ms=(\\\\d+)",
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
}`;

const apiList = [
  "`Gate.define(...)`",
  "`Plan.define(...)`",
  "`Plan.run(...)`",
  "`Plan.runLoop(...)`",
  "`Cloudflare.observe(...)`",
  "`Assert.hasAction(...)`",
  "`Assert.responseBodyIncludes(...)`",
  "`Assert.numericDeltaFromEnv(...)`",
];

const getCanonicalGoals = (scope: ScopeFile): ReadonlyArray<string> =>
  scope.plan.goals.map((goal) => goal.title);

export function renderPlanSnippet(_scope: ScopeFile, _options: { fileName?: string } = {}): string {
  return cinderPlanSnippet;
}

export function renderScopeSnippet(_scope: ScopeFile, _options: { fileName?: string } = {}): string {
  return cinderPlanSnippet;
}

export function renderReadme(
  scope: ScopeFile,
  options: RenderReadmeOptions = {},
): string {
  const fileName = options.fileName ?? "plan.ts";
  const runCommand = options.runCommand ?? `bun run ${fileName}`;
  const canonicalGoals = getCanonicalGoals(scope);

  return `# ${scope.spec.title}

${scope.spec.howTo.task}

## Tutorial

Goal: ${scope.spec.tutorial.goal}

### alchemy.run.ts

\`\`\`ts
${cinderProvisionSnippet}
\`\`\`

### plan.ts

\`\`\`ts
${cinderPlanSnippet}
\`\`\`

Outcome: ${scope.spec.tutorial.outcome}

## How To

Task: ${scope.spec.howTo.task}

Done when: ${scope.spec.howTo.done}

Run it:

\`\`\`bash
bun run alchemy.run.ts
${runCommand}
\`\`\`

## Breaking Changes In 0.4.0

- \`Prd.*\` is gone
- \`Claim.*\` is gone
- \`plan.ts\` is the canonical entrypoint
- \`Plan.*\` replaces the old front door

## Reference

Files:
- \`alchemy.run.ts\`
- \`plan.ts\`

Canonical gates:
${canonicalGoals.map((goal) => `- ${goal}`).join("\n")}

Loop:
- \`maxIterations: 1\`
- \`stopOnFailure: true\`

Core API:
${apiList.map((entry) => `- ${entry}`).join("\n")}

## Explanation

${scope.spec.explanation.summary}
`;
}

export function renderDocsContent(scope: ScopeFile): Record<string, string> {
  const canonicalGoals = getCanonicalGoals(scope);

  return {
    "tutorials/first-gate": `# Tutorial: Cinder Is The Canonical Example

Goal: ${scope.spec.tutorial.goal}

## alchemy.run.ts

\`\`\`ts
${cinderProvisionSnippet}
\`\`\`

## plan.ts

\`\`\`ts
${cinderPlanSnippet}
\`\`\`

## Outcome

${scope.spec.tutorial.outcome}`,
    "how-to/run-in-a-loop": `# How To: Prove The Live System

Task: ${scope.spec.howTo.task}

Done when: ${scope.spec.howTo.done}

## Why two files

- \`alchemy.run.ts\` provisions infrastructure once
- \`plan.ts\` reruns the proof loop against the live deployment
- the loop should never rebuild infrastructure on every iteration

## Gates that matter

${canonicalGoals.map((goal) => `- ${goal}`).join("\n")}`,
    "reference/api": `# Reference: API

The Cinder proof loop only needs a small public surface.

${apiList.map((entry) => `- ${entry}`).join("\n")}

## Notes

- Cloudflare worker logs are the primary proof source
- cleanup runs after the final plan result
- attached-agent behavior stays external to Gateproof`,
    "explanations/one-file-handoff": `# Explanation: One Proof File, One Provision File

${scope.spec.explanation.summary}

## Why the split matters

- provisioning and proof have different lifecycles
- Alchemy is idempotent, but it should still run once
- the proof loop should only answer one question: is the live product actually green?

## Why Cinder is the center

The core claim is not that a worker deployed. The core claim is that a warm build is materially faster than cold. Gateproof exists to make that claim executable and explicit.`,
  };
}

export function getFrontdoorContent(_scope: ScopeFile): FrontdoorContent {
  return {
    eyebrow: "Cinder-First Gateproof",
    headline: "Provision once. Prove the live system.",
    subheadline:
      "Gateproof is for the hard claim that decides whether the product is real. For Cinder, that means the live system only goes green when the speed claim holds.",
    provisionLabel: "alchemy.run.ts (run once)",
    provisionCode: cinderProvisionSnippet,
    planLabel: "plan.ts (proof loop)",
    planCode: cinderPlanSnippet,
    support: [
      "alchemy.run.ts creates the infrastructure once.",
      "plan.ts reruns only the acceptance logic against the live deployment.",
      "The speed claim is the product, not a side check.",
    ],
  };
}
