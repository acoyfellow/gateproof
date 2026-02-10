import { resolve } from "path";
import { readFileSync, writeFileSync } from "node:fs";
import type { Prd, Story, GateResult } from "./types";
import type { PrdReportV1, StoryResultV1, SerializableError } from "../report";
import { serializeError } from "../report";
import { validateScope, getDiffStats, type ScopeViolation } from "./scope-check";

export interface RunPrdResult {
  success: boolean;
  failedStory?: Story;
  error?: Error;
  report?: PrdReportV1;
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
 * Groups topologically-sorted stories into parallel "levels".
 * Stories within a level have all their dependencies satisfied by prior levels,
 * so they can execute concurrently.
 */
function buildLevels<TId extends string>(
  stories: readonly Story<TId>[]
): Story<TId>[][] {
  const ordered = orderStories(stories);
  const levels: Story<TId>[][] = [];
  const resolved = new Set<TId>();

  while (resolved.size < ordered.length) {
    const level: Story<TId>[] = [];
    for (const story of ordered) {
      if (resolved.has(story.id)) continue;
      const deps = story.dependsOn ?? [];
      if (deps.every((d) => resolved.has(d))) {
        level.push(story);
      }
    }
    if (level.length === 0) {
      throw new Error("Unable to resolve remaining story dependencies");
    }
    levels.push(level);
    for (const s of level) {
      resolved.add(s.id);
    }
  }

  return levels;
}

/**
 * Loads default forbidden paths from .gateproof/scope.defaults.json
 */
function loadDefaultForbidden(cwd: string): string[] {
  try {
    const defaultsPath = resolve(cwd, ".gateproof/scope.defaults.json");
    const content = readFileSync(defaultsPath, "utf-8");
    const parsed = JSON.parse(content) as { forbiddenPaths?: string[] };
    return parsed.forbiddenPaths ?? [];
  } catch {
    return [];
  }
}

type StoryOutcome<TId extends string> =
  | { ok: true; result: StoryResultV1 }
  | { ok: false; result: StoryResultV1; story: Story<TId>; error: Error };

/**
 * Runs a single story gate and returns a typed outcome.
 */
async function runStory<TId extends string>(
  story: Story<TId>,
  cwd: string,
  options: { checkScope?: boolean; baseRef: string; defaultForbidden: string[] }
): Promise<StoryOutcome<TId>> {
  const storyStartTime = Date.now();

  try {
    if (options.checkScope && story.scope) {
      const diffStats = getDiffStats(options.baseRef);
      const violations = validateScope(story, diffStats, options.defaultForbidden);
      if (violations.length > 0) {
        const violation = violations[0];
        const storyError: SerializableError = {
          name: "ScopeViolation",
          message: violation.message,
          tag: violation.category,
        };
        return {
          ok: false,
          result: {
            id: story.id, title: story.title, gateFile: story.gateFile,
            status: "failed", durationMs: Date.now() - storyStartTime, error: storyError,
          },
          story,
          error: new Error(violation.message),
        };
      }
    }

    const gatePath = resolve(cwd, story.gateFile);
    const mod = await import(`file://${gatePath}`);
    const run = mod.run;

    if (typeof run !== "function") {
      throw new Error(`Gate file must export "run" function: ${story.gateFile}`);
    }

    console.log(`\n--- ${story.id}: ${story.title}`);
    const result = (await run()) as GateResult;
    const durationMs = Date.now() - storyStartTime;

    // Check for positive signal if required
    if (result.status === "success" && story.requirePositiveSignal) {
      const evidence = result.evidence as { actionsSeen?: string[]; stagesSeen?: string[] } | undefined;
      const hasPositiveSignal =
        (evidence?.actionsSeen && evidence.actionsSeen.length > 0) ||
        (evidence?.stagesSeen && evidence.stagesSeen.length > 0);

      if (!hasPositiveSignal) {
        const storyError: SerializableError = {
          name: "NoPositiveSignal",
          message: `Story "${story.id}" requires positive signal but no actions or stages were observed`,
        };
        return {
          ok: false,
          result: {
            id: story.id, title: story.title, gateFile: story.gateFile,
            status: "failed", durationMs, error: storyError,
          },
          story,
          error: new Error(`No positive signal observed for story "${story.id}"`),
        };
      }
    }

    if (result.status !== "success") {
      const storyError: SerializableError = result.error ? serializeError(result.error) : {
        name: "GateFailed",
        message: `Gate failed with status: ${result.status}`,
      };
      return {
        ok: false,
        result: {
          id: story.id, title: story.title, gateFile: story.gateFile,
          status: result.status, durationMs, error: storyError,
        },
        story,
        error: new Error(`Gate failed with status: ${result.status}`),
      };
    }

    return {
      ok: true,
      result: {
        id: story.id, title: story.title, gateFile: story.gateFile,
        status: "success", durationMs,
      },
    };
  } catch (error) {
    const durationMs = Date.now() - storyStartTime;
    return {
      ok: false,
      result: {
        id: story.id, title: story.title, gateFile: story.gateFile,
        status: "failed", durationMs, error: serializeError(error),
      },
      story,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

function writeReport(reportPath: string | undefined, report: PrdReportV1): void {
  if (reportPath) {
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }
}

/**
 * Runs a PRD by executing story gates in dependency order.
 * Independent stories (no mutual dependencies) within a level run concurrently.
 * Stops on first failure within a level.
 */
export async function runPrd<TId extends string>(
  prd: Prd<TId>,
  cwd: string = process.cwd(),
  options: {
    reportPath?: string;
    checkScope?: boolean;
    baseRef?: string;
  } = {}
): Promise<RunPrdResult> {
  const levels = buildLevels(prd.stories);
  const storyResults: StoryResultV1[] = [];
  const startTime = Date.now();
  const defaultForbidden = loadDefaultForbidden(cwd);
  const baseRef = options.baseRef ?? (process.env.CI ? "origin/main" : "HEAD");

  for (const level of levels) {
    // Run all stories in this level concurrently
    const outcomes = await Promise.all(
      level.map((story) =>
        runStory(story, cwd, { checkScope: options.checkScope, baseRef, defaultForbidden })
      )
    );

    // Collect results from this level
    for (const outcome of outcomes) {
      storyResults.push(outcome.result);
    }

    // Check for any failures in this level
    const firstFailure = outcomes.find((o) => !o.ok);
    if (firstFailure && !firstFailure.ok) {
      const report: PrdReportV1 = {
        version: "1",
        success: false,
        stories: storyResults,
        failedStory: {
          id: firstFailure.story.id,
          title: firstFailure.story.title,
          gateFile: firstFailure.story.gateFile,
        },
        totalDurationMs: Date.now() - startTime,
      };
      writeReport(options.reportPath, report);
      return {
        success: false,
        failedStory: firstFailure.story,
        error: firstFailure.error,
        report,
      };
    }
  }

  const report: PrdReportV1 = {
    version: "1",
    success: true,
    stories: storyResults,
    totalDurationMs: Date.now() - startTime,
  };

  writeReport(options.reportPath, report);
  return { success: true, report };
}
