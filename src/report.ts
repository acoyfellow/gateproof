/**
 * Stable, versioned report schemas for machine-readable gate outputs.
 * All types are fully JSON-serializable (no Error objects, no functions).
 */

export interface SerializableError {
  tag?: string;
  name: string;
  message: string;
  stack?: string;
}

export interface GateResultV1 {
  version: "1";
  status: "success" | "failed" | "timeout";
  durationMs: number;
  logs: unknown[];
  evidence: {
    requestIds: string[];
    stagesSeen: string[];
    actionsSeen: string[];
    errorTags: string[];
  };
  error?: SerializableError;
}

export interface StoryResultV1 {
  id: string;
  title: string;
  gateFile: string;
  status: "success" | "failed" | "timeout";
  durationMs: number;
  error?: SerializableError;
}

export interface PrdReportV1 {
  version: "1";
  success: boolean;
  stories: StoryResultV1[];
  failedStory?: {
    id: string;
    title: string;
    gateFile: string;
  };
  totalDurationMs: number;
}

/**
 * Converts an Error (or Error-like object) into a SerializableError.
 * Preserves Effect-tagged errors (_tag) when present.
 */
export function serializeError(error: unknown): SerializableError {
  if (error instanceof Error) {
    const errorWithTag = error as Error & { _tag?: string };
    return {
      tag: errorWithTag._tag,
      name: error.name || "Error",
      message: error.message || String(error),
      stack: error.stack,
    };
  }
  
  if (error && typeof error === "object" && "_tag" in error) {
    const tagged = error as { _tag: string; message?: string; [k: string]: unknown };
    return {
      tag: tagged._tag,
      name: tagged._tag,
      message: tagged.message || String(error),
    };
  }
  
  return {
    name: "Error",
    message: String(error),
  };
}

/**
 * Sorts arrays deterministically (alphabetically) for stable output.
 */
export function sortDeterministic<T>(arr: T[]): T[] {
  return [...arr].sort();
}

/**
 * Converts a GateResult to a fully serializable GateResultV1.
 */
export function toGateResultV1(result: {
  status: "success" | "failed" | "timeout";
  durationMs: number;
  logs: unknown[];
  evidence: {
    requestIds: string[];
    stagesSeen: string[];
    actionsSeen: string[];
    errorTags: string[];
  };
  error?: Error | unknown;
}): GateResultV1 {
  return {
    version: "1",
    status: result.status,
    durationMs: result.durationMs,
    logs: result.logs,
    evidence: result.evidence,
    error: result.error ? serializeError(result.error) : undefined,
  };
}

/**
 * LLM-friendly failure summary for agents.
 * Provides structured, actionable information about what failed and why.
 */
export interface LLMFailureSummary {
  /** Short summary of what went wrong */
  summary: string;
  /** The specific assertions that failed */
  failedAssertions: Array<{
    name: string;
    message: string;
    expected?: string;
    actual?: string;
  }>;
  /** Relevant slice of the PRD (story details) */
  prdRelevantSlice?: {
    storyId: string;
    storyTitle: string;
    gateFile: string;
    scope?: {
      allowedPaths?: string[];
      forbiddenPaths?: string[];
    };
  };
  /** Evidence from the gate run */
  evidence: {
    actionsSeen: string[];
    stagesSeen: string[];
    errorTags: string[];
    logCount: number;
  };
  /** Recent diff snippet (truncated) */
  diffSnippet?: string;
  /** Suggested next steps */
  suggestions: string[];
}

/**
 * Creates an LLM-friendly failure summary from a PRD report.
 *
 * This format is optimized for AI agents to understand:
 * - What failed (specific assertions)
 * - Why it failed (evidence from logs)
 * - What to fix (suggestions)
 *
 * @example
 * ```ts
 * const summary = createLLMFailureSummary(report, {
 *   diffSnippet: gitDiffOutput,
 * });
 * console.log(JSON.stringify(summary, null, 2));
 * ```
 */
export function createLLMFailureSummary(
  report: PrdReportV1,
  options?: {
    prdSlice?: {
      storyId: string;
      storyTitle: string;
      gateFile: string;
      scope?: { allowedPaths?: string[]; forbiddenPaths?: string[] };
    };
    diffSnippet?: string;
    logs?: unknown[];
  }
): LLMFailureSummary {
  const failedStory = report.failedStory;
  const failedResult = report.stories.find((s) => s.id === failedStory?.id);

  const failedAssertions: LLMFailureSummary["failedAssertions"] = [];
  const suggestions: string[] = [];

  // Parse error to extract assertion details
  if (failedResult?.error) {
    const err = failedResult.error;

    if (err.tag === "AssertionFailed" || err.name === "AssertionFailed") {
      const match = err.message.match(/(\w+):\s*(.+)/);
      if (match) {
        failedAssertions.push({
          name: match[1],
          message: match[2],
        });

        // Add specific suggestions based on assertion type
        if (match[1] === "HasAction") {
          suggestions.push(`Ensure the code logs an action named "${match[2].replace("missing ", "").replace(/'/g, "")}"`);
          suggestions.push("Check if the relevant code path is being executed");
        } else if (match[1] === "NoErrors") {
          suggestions.push("Fix the error indicated in the logs");
          suggestions.push("Check error handling in the relevant code");
        } else if (match[1] === "HasStage") {
          suggestions.push(`Ensure a stage named "${match[2].replace("missing ", "").replace(/'/g, "")}" is logged`);
        }
      } else {
        failedAssertions.push({
          name: err.name || "Unknown",
          message: err.message,
        });
      }
    } else if (err.tag === "NoPositiveSignal" || err.name === "NoPositiveSignal") {
      failedAssertions.push({
        name: "NoPositiveSignal",
        message: "No actions or stages were observed in logs",
      });
      suggestions.push("Ensure the code is logging actions or stages");
      suggestions.push("Check if the observe resource is configured correctly");
    } else if (err.tag === "ScopeViolation" || err.name === "ScopeViolation") {
      failedAssertions.push({
        name: "ScopeViolation",
        message: err.message,
      });
      suggestions.push("Restrict changes to files within allowedPaths");
      suggestions.push("Avoid modifying files in forbiddenPaths");
    } else {
      failedAssertions.push({
        name: err.name || "Error",
        message: err.message,
      });
    }
  }

  // Build summary
  let summary = "Gate failed";
  if (failedStory) {
    summary = `Gate "${failedStory.id}" failed`;
  }
  if (failedResult?.error) {
    summary += `: ${failedResult.error.message}`;
  }

  // Extract evidence from logs if available
  const logs = options?.logs ?? [];
  const evidence = {
    actionsSeen: [] as string[],
    stagesSeen: [] as string[],
    errorTags: [] as string[],
    logCount: logs.length,
  };

  for (const log of logs) {
    if (log && typeof log === "object") {
      const l = log as Record<string, unknown>;
      if (l.action && typeof l.action === "string") {
        if (!evidence.actionsSeen.includes(l.action)) {
          evidence.actionsSeen.push(l.action);
        }
      }
      if (l.stage && typeof l.stage === "string") {
        if (!evidence.stagesSeen.includes(l.stage)) {
          evidence.stagesSeen.push(l.stage);
        }
      }
      if (l.error && typeof l.error === "object") {
        const err = l.error as Record<string, unknown>;
        if (err.tag && typeof err.tag === "string") {
          if (!evidence.errorTags.includes(err.tag)) {
            evidence.errorTags.push(err.tag);
          }
        }
      }
    }
  }

  // Add default suggestions if none
  if (suggestions.length === 0) {
    suggestions.push("Read the gate file to understand expected behavior");
    suggestions.push("Check if all required actions are being logged");
    suggestions.push("Verify the observe resource is receiving logs");
  }

  return {
    summary,
    failedAssertions,
    prdRelevantSlice: options?.prdSlice ?? (failedStory ? {
      storyId: failedStory.id,
      storyTitle: failedStory.title,
      gateFile: failedStory.gateFile,
    } : undefined),
    evidence,
    diffSnippet: options?.diffSnippet,
    suggestions,
  };
}

/**
 * Formats an LLM failure summary as a string block.
 * Useful for including in prompts or console output.
 */
export function formatLLMFailureSummary(summary: LLMFailureSummary): string {
  const lines: string[] = [
    "=== GATEPROOF FAILURE SUMMARY (LLM-FRIENDLY) ===",
    "",
    `Summary: ${summary.summary}`,
    "",
  ];

  if (summary.prdRelevantSlice) {
    lines.push("PRD Context:");
    lines.push(`  Story: ${summary.prdRelevantSlice.storyId}`);
    lines.push(`  Title: ${summary.prdRelevantSlice.storyTitle}`);
    lines.push(`  Gate: ${summary.prdRelevantSlice.gateFile}`);
    if (summary.prdRelevantSlice.scope?.allowedPaths) {
      lines.push(`  Allowed paths: ${summary.prdRelevantSlice.scope.allowedPaths.join(", ")}`);
    }
    lines.push("");
  }

  if (summary.failedAssertions.length > 0) {
    lines.push("Failed Assertions:");
    for (const assertion of summary.failedAssertions) {
      lines.push(`  - ${assertion.name}: ${assertion.message}`);
      if (assertion.expected) lines.push(`    Expected: ${assertion.expected}`);
      if (assertion.actual) lines.push(`    Actual: ${assertion.actual}`);
    }
    lines.push("");
  }

  lines.push("Evidence:");
  lines.push(`  Actions seen: ${summary.evidence.actionsSeen.join(", ") || "(none)"}`);
  lines.push(`  Stages seen: ${summary.evidence.stagesSeen.join(", ") || "(none)"}`);
  lines.push(`  Error tags: ${summary.evidence.errorTags.join(", ") || "(none)"}`);
  lines.push(`  Log count: ${summary.evidence.logCount}`);
  lines.push("");

  if (summary.diffSnippet) {
    lines.push("Recent Diff:");
    lines.push(summary.diffSnippet.split("\n").slice(0, 20).join("\n"));
    lines.push("");
  }

  lines.push("Suggestions:");
  for (const suggestion of summary.suggestions) {
    lines.push(`  - ${suggestion}`);
  }
  lines.push("");
  lines.push("=== END FAILURE SUMMARY ===");

  return lines.join("\n");
}
