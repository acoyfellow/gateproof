import type { Prd } from "./types";

/**
 * Helper to define a PRD with type-safe story IDs.
 * Preserves literal union types for StoryId.
 */
export function definePrd<TId extends string>(
  prd: Prd<TId>
): Prd<TId> {
  return prd;
}
