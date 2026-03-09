import { Effect } from "effect";
import { Plan } from "../src/index";
import { loadScope, selectGoalsThrough } from "./proof-lib";

async function main() {
  const goalId = process.argv[2]?.trim();
  if (!goalId) {
    throw new Error('usage: bun run prove:gate -- <gate-id>');
  }

  const scope = await loadScope();
  const targetedPlan = selectGoalsThrough(scope.plan, goalId);
  const result = await Effect.runPromise(Plan.run(targetedPlan));

  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "pass") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
