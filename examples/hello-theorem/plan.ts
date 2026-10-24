import { Effect } from "effect";
import {
  Act,
  Assert,
  Gate,
  Plan,
  type ScopeFile,
} from "../../src/index";

const here = import.meta.dir;

const scope = {
  spec: {
    title: "Hello Theorem",
    tutorial: {
      goal: "Prove one tiny Lean claim.",
      outcome: "The kernel accepts Claim.lean and rejects a sorry.",
    },
    howTo: {
      task: "Run lean on an honest file and on a sorry cheat.",
      done: "Honest check exits 0. Cheat check exits 1.",
    },
    explanation: {
      summary: "Gateproof loops. Lean judges. sorry is the fake verified.",
    },
  },
  plan: Plan.define({
    stories: [
      {
        id: "honest-kernel",
        title: "Claim.lean builds and has no sorry",
        scope: {
          allowedPaths: ["examples/hello-theorem/"],
          forbiddenPaths: ["src/"],
          maxChangedFiles: 2,
        },
        gate: Gate.define({
          act: [
            Act.exec(`sh ${here}/check.sh ${here}/Claim.lean`, {
              cwd: here,
              timeoutMs: 30000,
            }),
          ],
          assert: [Assert.noErrors()],
        }),
      },
      {
        id: "sorry-is-red",
        title: "cheat-sorry.lean must fail the check",
        dependsOn: ["honest-kernel"],
        scope: {
          allowedPaths: ["examples/hello-theorem/"],
          forbiddenPaths: ["src/"],
          maxChangedFiles: 0,
        },
        gate: Gate.define({
          act: [
            Act.exec(
              `sh -c 'sh ${here}/check.sh ${here}/cheat-sorry.lean; test $? -ne 0'`,
              { cwd: here, timeoutMs: 30000 },
            ),
          ],
          assert: [Assert.noErrors()],
        }),
      },
      {
        id: "axiom-is-red",
        title: "cheat-axiom.lean must fail the check",
        dependsOn: ["honest-kernel"],
        scope: {
          allowedPaths: ["examples/hello-theorem/"],
          forbiddenPaths: ["src/"],
          maxChangedFiles: 0,
        },
        gate: Gate.define({
          act: [
            Act.exec(
              `sh -c 'sh ${here}/check.sh ${here}/cheat-axiom.lean; test $? -ne 0'`,
              { cwd: here, timeoutMs: 30000 },
            ),
          ],
          assert: [Assert.noErrors()],
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
