/**
 * Native PRD loop function - enables agents and scripts to run the retry loop
 * without external bash orchestration.
 *
 * This is an additive feature - the existing `bun run prd:loop` command remains unchanged.
 */

import { resolve, dirname } from "node:path";
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { execSync } from "node:child_process";
import type { Prd, Story, GateResult, StoryScope } from "./types";
import type { PrdReportV1 } from "../report";
import { runPrd, type RunPrdResult } from "./runner";
import { getDiffStats } from "./scope-check";

/**
 * Context provided to custom agent functions
 */
export interface AgentContext {
  /** The relevant PRD slice (title + failing story details) */
  prdSlice: string;
  /** Summary of what failed and why */
  failureSummary: string;
  /** Recent git diff (truncated if too large) */
  recentDiff: string;
  /** The full PRD content */
  prdContent: string;
  /** The failed story details */
  failedStory?: Story;
  /** The report from the last run */
  lastReport?: PrdReportV1;
  /** Current iteration number */
  iteration: number;
}

/**
 * Result from a custom agent function
 */
export interface AgentResult {
  /** List of changes made (for logging) */
  changes: string[];
  /** Optional commit message if autoCommit is enabled */
  commitMsg?: string;
}

/**
 * Callback for iteration status updates
 */
export interface IterationStatus {
  /** Current attempt number (1-indexed) */
  attempt: number;
  /** Whether this attempt passed all gates */
  passed: boolean;
  /** Failure details if !passed */
  failure?: string;
  /** The failed story if any */
  failedStory?: Story;
  /** Duration of this iteration in ms */
  durationMs: number;
}

/**
 * Options for runPrdLoop
 */
export interface PrdLoopOptions {
  /** Maximum iterations before giving up (default: 7) */
  maxIterations?: number;

  /** Custom agent function to make changes. If not provided, uses default OpenCode Zen agent. */
  agent?: (ctx: AgentContext) => Promise<AgentResult>;

  /** Callback fired after each iteration */
  onIteration?: (status: IterationStatus) => void;

  /** Auto-commit changes after each successful agent run */
  autoCommit?: boolean | {
    /** Use simple-git instance for commits */
    git?: { commit: (message: string) => Promise<void>; add: (files: string[]) => Promise<void> };
  };

  /** Working directory (default: process.cwd()) */
  cwd?: string;

  /** Path to write PRD report (default: .gateproof/prd-report.json) */
  reportPath?: string;

  /** Whether to check scope constraints (default: true) */
  checkScope?: boolean;

  /** Git ref for scope checking */
  baseRef?: string;

  /** Append evidence to .gateproof/evidence.log */
  writeEvidenceLog?: boolean;

  /** Quiet mode - suppress console output */
  quiet?: boolean;
}

/**
 * Result from runPrdLoop
 */
export interface PrdLoopResult {
  /** Whether all gates eventually passed */
  success: boolean;
  /** Number of iterations run */
  attempts: number;
  /** Final failure message if !success */
  finalFailure?: string;
  /** The last report */
  lastReport?: PrdReportV1;
  /** Total duration in ms */
  totalDurationMs: number;
}

/**
 * Loads a PRD from a file path by dynamic import
 */
async function loadPrd<TId extends string>(prdPath: string): Promise<Prd<TId>> {
  const absolutePath = resolve(prdPath);
  const mod = await import(`file://${absolutePath}`);

  // Handle both default export and named 'prd' export
  if (mod.default && typeof mod.default === 'object' && 'stories' in mod.default) {
    return mod.default as Prd<TId>;
  }
  if (mod.prd && typeof mod.prd === 'object' && 'stories' in mod.prd) {
    return mod.prd as Prd<TId>;
  }

  throw new Error(`PRD file must export 'prd' or a default object with 'stories': ${prdPath}`);
}

/**
 * Gets a truncated git diff
 */
function getRecentDiff(baseRef: string = "HEAD", maxLines: number = 100): string {
  try {
    const diff = execSync(`git diff ${baseRef}`, {
      encoding: "utf-8",
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024, // 1MB
    });

    const lines = diff.split("\n");
    if (lines.length > maxLines) {
      return lines.slice(0, maxLines).join("\n") + `\n... (truncated, ${lines.length - maxLines} more lines)`;
    }
    return diff;
  } catch {
    return "(no diff available)";
  }
}

/**
 * Builds a context object for the agent
 */
function buildAgentContext(
  prdPath: string,
  result: RunPrdResult,
  iteration: number,
  baseRef: string
): AgentContext {
  const prdContent = readFileSync(prdPath, "utf-8");
  const failedStory = result.failedStory;

  // Build a focused slice of the PRD relevant to the failure
  let prdSlice = "";
  if (failedStory) {
    prdSlice = `Story: ${failedStory.id}\nTitle: ${failedStory.title}\nGate: ${failedStory.gateFile}`;
    if (failedStory.scope) {
      prdSlice += `\nScope: ${JSON.stringify(failedStory.scope, null, 2)}`;
    }
    if (failedStory.progress && failedStory.progress.length > 0) {
      prdSlice += `\nProgress: ${failedStory.progress.join(", ")}`;
    }
  }

  // Build failure summary
  let failureSummary = "";
  if (result.error) {
    failureSummary = result.error.message;
  }
  if (result.report?.failedStory) {
    const storyResult = result.report.stories.find(s => s.id === result.report?.failedStory?.id);
    if (storyResult?.error) {
      failureSummary += `\n${storyResult.error.tag || storyResult.error.name}: ${storyResult.error.message}`;
    }
  }

  return {
    prdSlice,
    failureSummary,
    recentDiff: getRecentDiff(baseRef),
    prdContent,
    failedStory,
    lastReport: result.report,
    iteration,
  };
}

/**
 * Ensures the .gateproof directory exists
 */
function ensureGateproofDir(cwd: string): string {
  const dir = resolve(cwd, ".gateproof");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Appends iteration evidence to the evidence log
 */
function appendEvidenceLog(
  cwd: string,
  iteration: number,
  status: IterationStatus,
  report?: PrdReportV1
): void {
  const gateproofDir = ensureGateproofDir(cwd);
  const logPath = resolve(gateproofDir, "evidence.log");

  const entry = {
    timestamp: new Date().toISOString(),
    iteration,
    passed: status.passed,
    durationMs: status.durationMs,
    failedStory: status.failedStory?.id,
    failure: status.failure,
    storiesRun: report?.stories.map(s => ({ id: s.id, status: s.status })),
  };

  appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf-8");
}

/**
 * Default agent that logs a warning (real agent integration requires API key)
 */
async function defaultNoopAgent(ctx: AgentContext): Promise<AgentResult> {
  console.warn(
    "[runPrdLoop] No agent function provided. Provide an agent option to enable automatic fixes."
  );
  console.log("\n--- Agent Context ---");
  console.log(`Iteration: ${ctx.iteration}`);
  console.log(`Failed story: ${ctx.failedStory?.id || "(none)"}`);
  console.log(`Failure: ${ctx.failureSummary}`);
  console.log("---\n");

  return { changes: [] };
}

/**
 * Runs the PRD loop, iterating until all gates pass or maxIterations is reached.
 *
 * This is the native, programmatic way to run the gateproof retry loop.
 * It can be called from scripts, tests, or integrated into custom tooling.
 *
 * @example
 * ```ts
 * import { runPrdLoop } from "gateproof/prd";
 *
 * const result = await runPrdLoop("./prd.ts", {
 *   maxIterations: 5,
 *   agent: async (ctx) => {
 *     // Make changes based on ctx.failureSummary
 *     return { changes: ["fixed the bug"] };
 *   },
 *   onIteration: (status) => {
 *     console.log(`Attempt ${status.attempt}: ${status.passed ? "passed" : "failed"}`);
 *   },
 * });
 *
 * if (result.success) {
 *   console.log("All gates passed!");
 * }
 * ```
 */
export async function runPrdLoop(
  /** Path to prd.ts file OR a Story object to run a single story */
  prdPathOrStory: string | Story,
  options: PrdLoopOptions = {}
): Promise<PrdLoopResult> {
  const {
    maxIterations = 7,
    agent = defaultNoopAgent,
    onIteration,
    autoCommit = false,
    cwd = process.cwd(),
    reportPath,
    checkScope = true,
    baseRef,
    writeEvidenceLog = false,
    quiet = false,
  } = options;

  const startTime = Date.now();
  const gateproofDir = ensureGateproofDir(cwd);
  const effectiveReportPath = reportPath ?? resolve(gateproofDir, "prd-report.json");

  // Determine the PRD path
  let prdPath: string;
  let singleStoryPrd: Prd | undefined;

  if (typeof prdPathOrStory === "string") {
    prdPath = resolve(cwd, prdPathOrStory);
  } else {
    // Single story mode - create a synthetic PRD
    const story = prdPathOrStory;
    prdPath = resolve(cwd, "prd.ts"); // For context building only
    singleStoryPrd = { stories: [story] };
  }

  const log = quiet ? () => {} : console.log;

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const iterStart = Date.now();
    log(`\n=== PRD Loop Iteration ${iteration}/${maxIterations} ===`);

    // Load or use the PRD
    let prd: Prd;
    if (singleStoryPrd) {
      prd = singleStoryPrd;
    } else {
      try {
        // Clear module cache for hot reloading
        delete require.cache[prdPath];
        prd = await loadPrd(prdPath);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          attempts: iteration,
          finalFailure: `Failed to load PRD: ${msg}`,
          totalDurationMs: Date.now() - startTime,
        };
      }
    }

    // Run the PRD
    const result = await runPrd(prd, cwd, {
      reportPath: effectiveReportPath,
      checkScope,
      baseRef,
    });

    const iterDuration = Date.now() - iterStart;

    // Build status for callback
    const status: IterationStatus = {
      attempt: iteration,
      passed: result.success,
      failure: result.error?.message,
      failedStory: result.failedStory,
      durationMs: iterDuration,
    };

    // Write evidence log if enabled
    if (writeEvidenceLog) {
      appendEvidenceLog(cwd, iteration, status, result.report);
    }

    // Call iteration callback
    onIteration?.(status);

    if (result.success) {
      log("\n✅ All PRD stories passed!");
      return {
        success: true,
        attempts: iteration,
        lastReport: result.report,
        totalDurationMs: Date.now() - startTime,
      };
    }

    log(`\n❌ Gate failed: ${result.failedStory?.id || "unknown"}`);
    if (result.error) {
      log(`   ${result.error.message}`);
    }

    // If this is the last iteration, don't call the agent
    if (iteration >= maxIterations) {
      break;
    }

    // Build context and call agent
    const ctx = buildAgentContext(
      prdPath,
      result,
      iteration,
      baseRef ?? (process.env.CI ? "origin/main" : "HEAD")
    );

    log("\n🤖 Calling agent to fix...");
    try {
      const agentResult = await agent(ctx);

      if (agentResult.changes.length > 0) {
        log(`   Made ${agentResult.changes.length} change(s):`);
        for (const change of agentResult.changes.slice(0, 5)) {
          log(`   - ${change}`);
        }
        if (agentResult.changes.length > 5) {
          log(`   ... and ${agentResult.changes.length - 5} more`);
        }

        // Auto-commit if enabled
        if (autoCommit && agentResult.commitMsg) {
          const commitMsg = agentResult.commitMsg;
          if (typeof autoCommit === "object" && autoCommit.git) {
            await autoCommit.git.add(["."]);
            await autoCommit.git.commit(commitMsg);
            log(`   📝 Committed: ${commitMsg}`);
          } else {
            try {
              execSync(`git add -A && git commit -m ${JSON.stringify(commitMsg)}`, {
                cwd,
                encoding: "utf-8",
              });
              log(`   📝 Committed: ${commitMsg}`);
            } catch {
              log(`   ⚠️ Commit failed (maybe no changes?)`);
            }
          }
        }
      } else {
        log("   No changes made by agent");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`   ⚠️ Agent error: ${msg}`);
    }
  }

  // Failed after all iterations
  const lastReport = existsSync(effectiveReportPath)
    ? JSON.parse(readFileSync(effectiveReportPath, "utf-8")) as PrdReportV1
    : undefined;

  return {
    success: false,
    attempts: maxIterations,
    finalFailure: `Failed after ${maxIterations} iterations`,
    lastReport,
    totalDurationMs: Date.now() - startTime,
  };
}

/**
 * Creates an agent function that uses the OpenCode Zen API.
 * This is a convenience wrapper for the most common use case.
 *
 * @example
 * ```ts
 * const agent = createOpenCodeAgent({
 *   apiKey: process.env.OPENCODE_ZEN_API_KEY,
 *   model: "big-pickle",
 * });
 *
 * await runPrdLoop("./prd.ts", { agent });
 * ```
 */
export function createOpenCodeAgent(config: {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  maxSteps?: number;
}): (ctx: AgentContext) => Promise<AgentResult> {
  const {
    apiKey = process.env.OPENCODE_ZEN_API_KEY,
    endpoint = "https://opencode.ai/zen/v1",
    model = "big-pickle",
    maxSteps = 10,
  } = config;

  if (!apiKey) {
    throw new Error("createOpenCodeAgent requires an API key (set OPENCODE_ZEN_API_KEY or pass apiKey)");
  }

  return async (ctx: AgentContext): Promise<AgentResult> => {
    // Dynamic import to avoid requiring ai/openai-compatible as hard deps
    const { generateText, tool } = await import("ai");
    const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
    const { z } = await import("zod");
    const { existsSync, readFileSync, writeFileSync } = await import("node:fs");

    const opencode = createOpenAICompatible({
      name: "opencode-zen",
      apiKey,
      baseURL: endpoint,
    });

    const changes: string[] = [];

    // Define tools - using type assertions to work around strict AI SDK typing
    // The runtime behavior is correct per AI SDK documentation
    const readTool = tool({
      description: "Read the contents of a file at the given path.",
      parameters: z.object({
        path: z.string().describe("The file path to read"),
      }),
      execute: async (params: { path: string }) => {
        if (!existsSync(params.path)) return `Error: file not found: ${params.path}`;
        return readFileSync(params.path, "utf8");
      },
    } as unknown as ReturnType<typeof tool>);

    const writeTool = tool({
      description: "Write file contents exactly (overwrites).",
      parameters: z.object({
        path: z.string().describe("File path"),
        content: z.string().describe("Full file contents"),
      }),
      execute: async (params: { path: string; content: string }) => {
        writeFileSync(params.path, params.content, "utf8");
        changes.push(`Wrote ${params.path}`);
        return `Wrote ${params.path}`;
      },
    } as unknown as ReturnType<typeof tool>);

    const replaceTool = tool({
      description: "Replace a string in a file. Fails if the string is not found.",
      parameters: z.object({
        path: z.string().describe("File path"),
        old_string: z.string().describe("String to replace"),
        new_string: z.string().describe("Replacement string"),
      }),
      execute: async (params: { path: string; old_string: string; new_string: string }) => {
        if (!existsSync(params.path)) return `Error: file not found: ${params.path}`;
        const content = readFileSync(params.path, "utf8");
        if (!content.includes(params.old_string)) {
          return `Error: string not found in ${params.path}`;
        }
        const next = content.replace(params.old_string, params.new_string);
        writeFileSync(params.path, next, "utf8");
        changes.push(`Updated ${params.path}`);
        return `Updated ${params.path}`;
      },
    } as unknown as ReturnType<typeof tool>);

    const tools = { read: readTool, write: writeTool, replace: replaceTool };

    const prompt = `You are a gateproof loop agent.

Goal:
- Make the PRD pass (all gates green).

Rules:
- Use the provided tools to inspect and edit files.
- Keep changes minimal and scoped to what's needed to pass.
- Fix only the specific failing assertion.

PRD Content:
${ctx.prdContent}

Failed Story:
${ctx.prdSlice}

Failure Summary:
${ctx.failureSummary}

Recent Diff:
${ctx.recentDiff}
`;

    const result = await generateText({
      model: opencode(model),
      tools,
      maxSteps: maxSteps as number,
      prompt,
    } as Parameters<typeof generateText>[0]);

    return {
      changes,
      commitMsg: changes.length > 0
        ? `fix(prd): ${ctx.failedStory?.id || "gate"} - iteration ${ctx.iteration}`
        : undefined,
    };
  };
}
