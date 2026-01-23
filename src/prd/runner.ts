import { resolve } from "path";
import type { Prd, Story, GateResult } from "./types";

export interface RunPrdResult {
  success: boolean;
  failedStory?: Story;
  error?: Error;
}

/**
 * Validates that all story dependencies exist and there are no cycles.
 */
function validateDependencies<TId extends string>(
  stories: readonly Story<TId>[]
): void {
  const byId = new Map(stories.map((s) => [s.id, s]));

  for (const story of stories) {
    const deps = story.dependsOn ?? [];
    for (const depId of deps) {
      if (!byId.has(depId)) {
        throw new Error(
          `Story "${story.id}" depends on unknown story "${depId}"`
        );
      }
    }
  }
}

/**
 * Topologically sorts stories by their dependencies.
 * Throws if there's a cycle or missing dependency.
 */
function orderStories<TId extends string>(
  stories: readonly Story<TId>[]
): Story<TId>[] {
  validateDependencies(stories);

  const byId = new Map(stories.map((s) => [s.id, s]));
  const out: Story<TId>[] = [];
  const remaining = new Set(stories.map((s) => s.id));
  const visiting = new Set<TId>();

  function visit(id: TId): void {
    if (visiting.has(id)) {
      throw new Error(`PRD dependency cycle detected involving "${id}"`);
    }
    if (!remaining.has(id)) {
      return;
    }

    visiting.add(id);
    const story = byId.get(id);
    if (!story) {
      throw new Error(`Unknown story id: ${id}`);
    }

    const deps = story.dependsOn ?? [];
    for (const depId of deps) {
      visit(depId);
    }

    visiting.delete(id);
    remaining.delete(id);
    out.push(story);
  }

  while (remaining.size > 0) {
    const nextId = Array.from(remaining)[0];
    visit(nextId);
  }

  return out;
}

/**
 * Runs a PRD by executing story gates in dependency order.
 * Stops on first failure.
 */
export async function runPrd<TId extends string>(
  prd: Prd<TId>,
  cwd: string = process.cwd()
): Promise<RunPrdResult> {
  const ordered = orderStories(prd.stories);

  for (const story of ordered) {
    try {
      const gatePath = resolve(cwd, story.gateFile);
      const mod = await import(`file://${gatePath}`);
      const run = mod.run;

      if (typeof run !== "function") {
        throw new Error(`Gate file must export "run" function: ${story.gateFile}`);
      }

      console.log(`\n--- ${story.id}: ${story.title}`);
      const result = (await run()) as GateResult;

      if (result.status !== "success") {
        return {
          success: false,
          failedStory: story,
          error: new Error(`Gate failed with status: ${result.status}`),
        };
      }
    } catch (error) {
      return {
        success: false,
        failedStory: story,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  return { success: true };
}
