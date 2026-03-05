/**
 * Validates plan.ts: loads scope and checks shape (spec + plan with goals/gates).
 * Exits 0 if valid, 1 with message otherwise.
 * Used by CI and Gates workflow.
 */
import type { ScopeFile } from "../src/index";

let scope: unknown;
try {
  scope = (await import("../plan")).default;
} catch (err) {
  console.error("Failed to load plan.ts:", err);
  process.exit(1);
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error("plan:validate:", message);
    process.exit(1);
  }
}

assert(scope !== null && typeof scope === "object", "plan default export must be an object");

const s = scope as Record<string, unknown>;
assert("spec" in s && s.spec !== null && typeof s.spec === "object", "scope must have spec");
assert("plan" in s && s.plan !== null && typeof s.plan === "object", "scope must have plan");

const spec = s.spec as Record<string, unknown>;
assert(typeof spec.title === "string", "spec.title must be a string");
assert(spec.tutorial !== null && typeof spec.tutorial === "object", "spec.tutorial required");
assert(
  typeof (spec.tutorial as Record<string, unknown>).goal === "string",
  "spec.tutorial.goal required",
);
assert(spec.howTo !== null && typeof spec.howTo === "object", "spec.howTo required");
assert(spec.explanation !== null && typeof spec.explanation === "object", "spec.explanation required");

const plan = s.plan as Record<string, unknown>;
if (!Array.isArray(plan.goals) || (plan.goals as unknown[]).length === 0) {
  console.error("plan:validate: plan.goals must be a non-empty array");
  process.exit(1);
}
const goalsList = plan.goals as unknown[];

for (let i = 0; i < goalsList.length; i++) {
  const goal = goalsList[i];
  assert(goal !== null && typeof goal === "object", `goal[${i}] must be an object`);
  const g = goal as Record<string, unknown>;
  assert(typeof g.id === "string", `goal[${i}].id required`);
  assert(typeof g.title === "string", `goal[${i}].title required`);
  assert(g.gate !== null && typeof g.gate === "object", `goal[${i}].gate required`);
  const gate = g.gate as Record<string, unknown>;
  assert(
    gate.observe === undefined ||
      (typeof gate.observe === "object" && gate.observe !== null && "kind" in gate.observe),
    `goal[${i}].gate.observe must be undefined or an observe resource`,
  );
  assert(
    gate.assert === undefined || Array.isArray(gate.assert),
    `goal[${i}].gate.assert must be array if present`,
  );
}

// Type-level: scope matches ScopeFile after runtime checks
const _typed: ScopeFile = scope as ScopeFile;
void _typed;

console.log("plan:validate OK (shape + goals)");
process.exit(0);
