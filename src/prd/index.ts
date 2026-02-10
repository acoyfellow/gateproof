export type { Prd, Story, GateResult, StoryScope } from "./types";
export { definePrd } from "./define-prd";
export { runPrd, type RunPrdResult } from "./runner";
export { validateScope, getDiffStats, type ScopeViolation } from "./scope-check";

// Scope defaults (additive feature)
export {
  inferScopeDefaults,
  getScopeDefaults,
  applyDefaultScope,
  loadCustomScopeDefaults,
  DEFAULT_FORBIDDEN_PATHS,
  COMMON_SRC_PATTERNS,
  type InferredScopeDefaults,
} from "./scope-defaults";

// Native loop function (additive feature)
export {
  runPrdLoop,
  createOpenCodeAgent,
  type PrdLoopOptions,
  type PrdLoopResult,
  type AgentContext,
  type AgentResult,
  type IterationStatus,
} from "./loop";