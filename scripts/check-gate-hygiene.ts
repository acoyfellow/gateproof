import type { ScopeFile } from "../src/index";

const SEPARATOR = "(?:\\u2014|--)";
const TITLE_GRAMMAR = new RegExp(
  `^\\s*\\S.*?\\s+${SEPARATOR}\\s+evidence:\\s*\\S+\\s+${SEPARATOR}\\s+scope:\\s*\\S.*$`,
);

export const checkTitleGrammar = (title: string): { ok: boolean; reason?: string } => {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "empty title" };
  }

  if (TITLE_GRAMMAR.test(trimmed)) {
    return { ok: true };
  }

  const hasEvidenceClause = /(?:\u2014|--)\s*evidence:\s*\S+/.test(trimmed);
  const hasScopeClause = /(?:\u2014|--)\s*scope:\s*\S+/.test(trimmed);

  if (!hasEvidenceClause && !hasScopeClause) {
    return { ok: false, reason: "missing evidence: and scope: clauses" };
  }
  if (!hasEvidenceClause) {
    return { ok: false, reason: "missing evidence: clause" };
  }
  if (!hasScopeClause) {
    return { ok: false, reason: "missing scope: clause" };
  }

  return { ok: false, reason: "title does not match <behavior> - evidence: <id> - scope: <path>" };
};

if (import.meta.main) {
  const issues: string[] = [];

  let scope: ScopeFile;
  try {
    scope = (await import("../plan")).default as ScopeFile;
  } catch (error) {
    console.error("gate-hygiene:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  for (const goal of scope.plan.stories) {
    if (!goal.title.trim()) {
      issues.push(`${goal.id}: missing title`);
    } else {
      const grammar = checkTitleGrammar(goal.title);
      if (!grammar.ok) {
        console.error(`hygiene warn: goal '${goal.id}' title ${grammar.reason}`);
      }
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
}
