import { Effect } from "effect";
import {
  Act,
  Assert,
  Gate,
  Plan,
  createHttpObserveResource,
  type ScopeFile,
} from "./src/index";
import { HELLO_WORLD_PORT } from "./examples/hello-world/server";

const baseUrl = `http://127.0.0.1:${HELLO_WORLD_PORT}`;

const scope = {
  spec: {
    title: "Gateproof",
    tutorial: {
      goal: "Prove one tiny thing.",
      outcome: "The run only passes when the live response says hello world.",
    },
    howTo: {
      task: "Run one complete gate from one file.",
      done: "The endpoint returns 200 and the body contains hello world.",
    },
    explanation: {
      summary: "Root plan.ts stays small. Gateproof itself is built forward.",
    },
  },
  plan: Plan.define({
    goals: [
      {
        id: "hello-world",
        title: "GET / returns hello world",
        scope: {
          allowedPaths: ["examples/hello-world/"],
          forbiddenPaths: ["plan.ts", "README.md", "demo/src/routes/case-studies/"],
          maxChangedFiles: 2,
          maxChangedLines: 50,
        },
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
