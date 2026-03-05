import { Effect } from "effect";
import {
  Act,
  Assert,
  Gate,
  Plan,
  createHttpObserveResource,
} from "../../src/index";

const plan = Plan.define({
  goals: [
    {
      id: "http-ok",
      title: "GET / returns 200",
      gate: Gate.define({
        observe: createHttpObserveResource({ url: "https://api.example.com/health" }),
        act: [Act.exec("curl -sf https://api.example.com/health")],
        assert: [
          Assert.httpResponse({ status: 200 }),
          Assert.noErrors(),
        ],
      }),
    },
  ],
  loop: {
    maxIterations: 3,
    stopOnFailure: true,
  },
});

if (import.meta.main) {
  const result = await Effect.runPromise(
    Plan.runLoop(plan, {
      worker: (ctx) =>
        Effect.succeed({
          changes: [{ kind: "replace" as const, path: "src/app.ts", summary: "Fix failing gate" }],
          summary: "Worker attempt",
        }),
      maxIterations: 3,
    }),
  );
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "pass") process.exit(1);
}
