import { resolve } from "path";
import { readFileSync } from "node:fs";
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

/**
 * Runs a PRD by executing story gates in dependency order.
 * Stops on first failure.
 * 
 * @param options.reportPath - If provided, writes a structured JSON report to this path
 * @param options.checkScope - If true, validates scope constraints against git diff
 * @param options.baseRef - Git ref to compare against for scope checking (default: "HEAD" for local, "origin/main" for CI)
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
  const ordered = orderStories(prd.stories);
  const storyResults: StoryResultV1[] = [];
  const startTime = Date.now();
  const defaultForbidden = loadDefaultForbidden(cwd);
  const baseRef = options.baseRef ?? (process.env.CI ? "origin/main" : "HEAD");

  for (const story of ordered) {
    const storyStartTime = Date.now();
    let storyError: SerializableError | undefined;

    try {
      if (options.checkScope && story.scope) {
        const diffStats = getDiffStats(baseRef);
        const violations = validateScope(story, diffStats, defaultForbidden);
        if (violations.length > 0) {
          const violation = violations[0];
          storyError = {
            name: "ScopeViolation",
            message: violation.message,
            tag: violation.category,
          };
          storyResults.push({
            id: story.id,
            title: story.title,
            gateFile: story.gateFile,
            status: "failed",
            durationMs: Date.now() - storyStartTime,
            error: storyError,
          });
          const report: PrdReportV1 = {
            version: "1",
            success: false,
            stories: storyResults,
            failedStory: {
              id: story.id,
              title: story.title,
              gateFile: story.gateFile,
            },
            totalDurationMs: Date.now() - startTime,
          };
          if (options.reportPath) {
            const { writeFileSync } = await import("node:fs");
            writeFileSync(options.reportPath, JSON.stringify(report, null, 2));
          }
          return {
            success: false,
            failedStory: story,
            error: new Error(violation.message),
            report,
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
          storyError = {
            name: "NoPositiveSignal",
            message: `Story "${story.id}" requires positive signal but no actions or stages were observed`,
          };
          storyResults.push({
            id: story.id,
            title: story.title,
            gateFile: story.gateFile,
            status: "failed",
            durationMs,
            error: storyError,
          });
          const report: PrdReportV1 = {
            version: "1",
            success: false,
            stories: storyResults,
            failedStory: {
              id: story.id,
              title: story.title,
              gateFile: story.gateFile,
            },
            totalDurationMs: Date.now() - startTime,
          };
          if (options.reportPath) {
            const { writeFileSync } = await import("node:fs");
            writeFileSync(options.reportPath, JSON.stringify(report, null, 2));
          }
          return {
            success: false,
            failedStory: story,
            error: new Error(`No positive signal observed for story "${story.id}"`),
            report,
          };
        }
      }

      if (result.status !== "success") {
        storyError = result.error ? serializeError(result.error) : {
          name: "GateFailed",
          message: `Gate failed with status: ${result.status}`,
        };
        storyResults.push({
          id: story.id,
          title: story.title,
          gateFile: story.gateFile,
          status: result.status,
          durationMs,
          error: storyError,
        });
        const report: PrdReportV1 = {
          version: "1",
          success: false,
          stories: storyResults,
          failedStory: {
            id: story.id,
            title: story.title,
            gateFile: story.gateFile,
          },
          totalDurationMs: Date.now() - startTime,
        };
        if (options.reportPath) {
          const { writeFileSync } = await import("node:fs");
          writeFileSync(options.reportPath, JSON.stringify(report, null, 2));
        }
        return {
          success: false,
          failedStory: story,
          error: new Error(`Gate failed with status: ${result.status}`),
          report,
        };
      }

      storyResults.push({
        id: story.id,
        title: story.title,
        gateFile: story.gateFile,
        status: "success",
        durationMs,
      });
    } catch (error) {
      const durationMs = Date.now() - storyStartTime;
      storyError = serializeError(error);
      storyResults.push({
        id: story.id,
        title: story.title,
        gateFile: story.gateFile,
        status: "failed",
        durationMs,
        error: storyError,
      });
      const report: PrdReportV1 = {
        version: "1",
        success: false,
        stories: storyResults,
        failedStory: {
          id: story.id,
          title: story.title,
          gateFile: story.gateFile,
        },
        totalDurationMs: Date.now() - startTime,
      };
      if (options.reportPath) {
        const { writeFileSync } = await import("node:fs");
        writeFileSync(options.reportPath, JSON.stringify(report, null, 2));
      }
      return {
        success: false,
        failedStory: story,
        error: error instanceof Error ? error : new Error(String(error)),
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

  if (options.reportPath) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(options.reportPath, JSON.stringify(report, null, 2));
  }

  return { success: true, report };
}
