import { Effect } from "effect";
import {
  Act,
  Assert,
  Gate,
  Plan,
  Require,
} from "../../src/index";
import { Cloudflare } from "../../src/cloudflare/index";

const workerLogs = Cloudflare.observe({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
  apiToken: process.env.CLOUDFLARE_API_TOKEN ?? "",
  workerName: process.env.CLOUDFLARE_WORKER_NAME ?? "my-worker",
  sinceMs: 60_000,
  pollInterval: 500,
});

const plan = Plan.define({
  goals: [
    {
      id: "worker-responds",
      title: "Worker logs request_received",
      gate: Gate.define({
        observe: workerLogs,
        prerequisites: [
          Require.env("CLOUDFLARE_ACCOUNT_ID"),
          Require.env("CLOUDFLARE_API_TOKEN"),
        ],
        act: [
          Act.exec("curl -sf https://my-worker.workers.dev/"),
        ],
        assert: [
          Assert.noErrors(),
          Assert.hasAction("request_received"),
        ],
        timeoutMs: 10_000,
      }),
    },
  ],
  loop: { maxIterations: 1, stopOnFailure: true },
});

if (import.meta.main) {
  const result = await Effect.runPromise(Plan.run(plan));
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "pass") process.exit(1);
}
