import type { ScopeFile } from "../src/index";

const issues: string[] = [];

let scope: ScopeFile;
try {
  scope = (await import("../plan")).default as ScopeFile;
} catch (error) {
  console.error("gate-hygiene:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}

for (const goal of scope.plan.goals) {
  if (!goal.title.trim()) {
    issues.push(`${goal.id}: missing title`);
  }

  if ((goal.gate.act?.length ?? 0) === 0) {
    issues.push(`${goal.id}: missing act steps`);
  }

  if ((goal.gate.assert?.length ?? 0) === 0) {
    issues.push(`${goal.id}: missing assertions`);
  }

  if (!goal.gate.observe) {
    issues.push(`${goal.id}: missing grounded witness (observe)`);
  }

  const scopeDef = goal.scope;
  if (!scopeDef) {
    issues.push(`${goal.id}: missing scope`);
    continue;
  }

  const hasPathScope =
    (scopeDef.allowedPaths?.length ?? 0) > 0 || (scopeDef.forbiddenPaths?.length ?? 0) > 0;
  const hasChangeBudget =
    typeof scopeDef.maxChangedFiles === "number" || typeof scopeDef.maxChangedLines === "number";

  if (!hasPathScope) {
    issues.push(`${goal.id}: scope has no allowed/forbidden paths`);
  }

  if (!hasChangeBudget) {
    issues.push(`${goal.id}: scope has no change budget`);
  }
}

if (issues.length > 0) {
  for (const issue of issues) {
    console.error(`gate-hygiene: ${issue}`);
  }
  process.exit(1);
}

console.log("gate-hygiene OK");
