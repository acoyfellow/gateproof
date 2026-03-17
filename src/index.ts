import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, mkdir, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, relative, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Effect } from "effect";

const createRequestTimeout = (
  timeoutMs: number,
): { signal: AbortSignal; clear: () => void } => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
};

const DEFAULT_ALLOWED_PATHS = ["src/", "app/", "components/", "pages/", "lib/"] as const;
const DEFAULT_FORBIDDEN_PATHS = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  ".env",
  "plan.ts",
  "README.md",
  "demo/src/routes/case-studies/",
] as const;

const normalizePath = (value: string): string => value.replaceAll("\\", "/");

const isPathInside = (cwd: string, candidate: string): boolean => {
  const resolved = resolve(cwd, candidate);
  const rel = normalizePath(relative(cwd, resolved));
  return rel === "" || (!rel.startsWith("../") && rel !== "..");
};

const ensureTrailingSlash = (value: string): string =>
  value.endsWith("/") ? value : `${value}/`;

const countLines = (value: string): number => {
  if (value.length === 0) {
    return 0;
  }

  return value.split(/\r?\n/).length;
};

export type GateStatus = "pass" | "fail" | "skip" | "inconclusive";
export type ProofStrength = "strong" | "moderate" | "weak" | "none";

export interface SpecTutorial {
  goal: string;
  outcome: string;
}

export interface SpecHowTo {
  task: string;
  done: string;
}

export interface SpecExplanation {
  summary: string;
}

export interface SpecDefinition {
  title: string;
  tutorial: SpecTutorial;
  howTo: SpecHowTo;
  explanation: SpecExplanation;
}

export interface HttpObserveResourceDefinition {
  kind: "http";
  url: string;
  pollInterval?: number;
  headers?: Record<string, string>;
}

export interface CloudflareObserveDefinition {
  kind: "cloudflare-workers-logs";
  accountId: string;
  apiToken: string;
  workerName: string;
  backend?: "workers-logs";
  sinceMs?: number;
  pollInterval?: number;
}

export interface ExecActionDefinition {
  kind: "exec";
  command: string;
  cwd?: string;
  timeoutMs?: number;
}

export interface EnvPrerequisiteDefinition {
  kind: "env";
  name: string;
  reason?: string;
}

export interface HttpResponseAssertionDefinition {
  kind: "httpResponse";
  actionIncludes?: string;
  status: number;
}

export interface DurationAssertionDefinition {
  kind: "duration";
  actionIncludes?: string;
  atMostMs: number;
}

export interface NoErrorsAssertionDefinition {
  kind: "noErrors";
}

export interface HasActionAssertionDefinition {
  kind: "hasAction";
  action: string;
}

export interface ResponseBodyIncludesAssertionDefinition {
  kind: "responseBodyIncludes";
  text: string;
}

export interface NumericDeltaFromEnvAssertionDefinition {
  kind: "numericDeltaFromEnv";
  source: "httpBody" | "logMessage";
  pattern: string;
  baselineEnv: string;
  minimumDelta: number;
}

export type ObserveResourceDefinition =
  | HttpObserveResourceDefinition
  | CloudflareObserveDefinition;
export type ActionDefinition = ExecActionDefinition;
export type PrerequisiteDefinition = EnvPrerequisiteDefinition;
export type AssertionDefinition =
  | HttpResponseAssertionDefinition
  | DurationAssertionDefinition
  | NoErrorsAssertionDefinition
  | HasActionAssertionDefinition
  | ResponseBodyIncludesAssertionDefinition
  | NumericDeltaFromEnvAssertionDefinition;

export interface GateDefinition {
  observe?: ObserveResourceDefinition;
  act?: ReadonlyArray<ActionDefinition>;
  assert?: ReadonlyArray<AssertionDefinition>;
  prerequisites?: ReadonlyArray<PrerequisiteDefinition>;
  timeoutMs?: number;
}

export interface PlanScope {
  allowedPaths?: ReadonlyArray<string>;
  forbiddenPaths?: ReadonlyArray<string>;
  maxChangedFiles?: number;
  maxChangedLines?: number;
}

export interface PlanGoal {
  id: string;
  title: string;
  gate: GateDefinition;
  scope?: PlanScope;
}

export interface PlanLoop {
  maxIterations?: number;
  stopOnFailure?: boolean;
}

export interface PlanCleanup {
  actions: ReadonlyArray<ActionDefinition>;
}

export interface PlanDefinition {
  goals: ReadonlyArray<PlanGoal>;
  loop?: PlanLoop;
  cleanup?: PlanCleanup;
}

export interface ScopeFile {
  spec: SpecDefinition;
  plan: PlanDefinition;
}

export interface ActionResult {
  kind: "exec";
  command: string;
  ok: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface HttpObservationResult {
  kind: "http";
  url: string;
  status: number;
  durationMs: number;
  ok: boolean;
  body: string;
}

export interface LogEvent {
  timestamp?: string;
  level?: string;
  message?: string;
  action?: string;
  stage?: string;
  metadata?: Record<string, unknown>;
}

export interface GateEvidence {
  actions: ReadonlyArray<ActionResult>;
  http?: HttpObservationResult;
  logs?: ReadonlyArray<LogEvent>;
  errors: ReadonlyArray<string>;
}

export interface GateRunResult {
  id: string;
  title: string;
  status: GateStatus;
  proofStrength: ProofStrength;
  summary: string;
  evidence: GateEvidence;
}

export interface PlanRunResult {
  status: GateStatus;
  proofStrength: ProofStrength;
  iterations: number;
  goals: ReadonlyArray<GateRunResult>;
  summary: string;
  cleanupErrors: ReadonlyArray<string>;
}

export interface RunIdentityEnvelope {
  traceId: string | null;
  workspaceId: string | null;
  conversationId: string | null;
  runId: string | null;
  proofRunId: string | null;
  proofIterationId: string | null;
}

export interface MemoryRecall {
  prompt?: string;
  learnings: ReadonlyArray<{
    id?: string;
    trigger: string;
    learning: string;
    reason?: string;
    source?: string;
  }>;
  stateSummary?: string;
  raw?: unknown;
}

export interface WorkerContext {
  iteration: number;
  plan: PlanDefinition;
  result: PlanRunResult;
  failedGoals: ReadonlyArray<GateRunResult>;
  firstFailedGoal: GateRunResult | null;
  cwd: string;
  planPath?: string;
  activeScope?: PlanScope;
  latestReportPath?: string;
  identity: RunIdentityEnvelope;
  recall?: MemoryRecall | null;
}

export interface WorkerChange {
  kind: "write" | "replace" | "create" | "delete" | "exec";
  path?: string;
  summary: string;
}

export interface WorkerResult {
  changes: ReadonlyArray<WorkerChange>;
  summary: string;
  commitMessage?: string;
  stop?: boolean;
  identity?: Partial<RunIdentityEnvelope>;
  debug?: {
    attempts?: number;
    rawAssistantContentExcerpt?: string;
    normalizedAssistantContentExcerpt?: string;
    lastHttpStatus?: number;
  };
}

export interface WorkerRuntime {
  runWorker(context: WorkerContext): Effect.Effect<WorkerResult, never, never>;
}

export interface MemoryEntry {
  iteration: number;
  timestamp: string;
  identity: RunIdentityEnvelope;
  recall?: MemoryRecall | null;
  firstFailedGoal: {
    id: string;
    title: string;
    summary: string;
  } | null;
  result: PlanRunResult;
  worker?: {
    summary?: string;
    changes: ReadonlyArray<WorkerChange>;
    timedOut?: boolean;
    stopped?: boolean;
    scopeViolation?: string;
  };
  commit?: {
    sha?: string;
    message?: string;
    empty?: boolean;
  };
}

export interface MemoryRecallContext {
  iteration: number;
  cwd: string;
  planPath?: string;
  plan: PlanDefinition;
  result: PlanRunResult;
  failedGoals: ReadonlyArray<GateRunResult>;
  firstFailedGoal: GateRunResult | null;
  identity: RunIdentityEnvelope;
}

export interface MemoryWorkingStateEntry {
  timestamp: string;
  identity: RunIdentityEnvelope;
  result: PlanRunResult;
  firstFailedGoal: GateRunResult | null;
}

export interface MemoryResolutionEntry {
  timestamp: string;
  identity: RunIdentityEnvelope;
  result: PlanRunResult;
  firstFailedGoal: GateRunResult | null;
}

export interface MemoryRuntime {
  recallIteration?(
    context: MemoryRecallContext,
  ): Effect.Effect<MemoryRecall | null, never, never>;
  writeIteration(entry: MemoryEntry): Effect.Effect<void, never, never>;
  updateWorkingState?(
    entry: MemoryWorkingStateEntry,
  ): Effect.Effect<void, never, never>;
  resolveWorkingState?(
    entry: MemoryResolutionEntry,
  ): Effect.Effect<void, never, never>;
}

export type LoopWorker =
  | ((context: WorkerContext) => Effect.Effect<WorkerResult, never, never>)
  | null
  | undefined;

export interface LoopCommitOptions {
  enabled?: boolean;
  allowEmpty?: boolean;
}

export interface LoopIterationStatus {
  iteration: number;
  identity: RunIdentityEnvelope;
  recall?: MemoryRecall | null;
  result: PlanRunResult;
  firstFailedGoal: GateRunResult | null;
  workerCalled: boolean;
  workerSummary?: string;
  committed: boolean;
  commitSha?: string;
  reportPath?: string;
}

export interface PlanRunLoopOptions {
  maxIterations?: number;
  worker?: LoopWorker;
  cwd?: string;
  planPath?: string;
  workerTimeoutMs?: number;
  commit?: LoopCommitOptions;
  onIteration?: (status: LoopIterationStatus) => void;
  memory?: MemoryRuntime;
  rerunFailedGoalPrefix?: boolean;
}

export interface OpenCodeWorkerOptions {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  maxSteps?: number;
  timeoutMs?: number;
  prompt?: string;
}

export interface FilepathWorkerOptions {
  endpoint: string;
  workspaceId: string;
  harnessId: string;
  model: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface DejaMemoryOptions {
  endpoint: string;
  scope: string;
  apiKey?: string;
  recallLimit?: number;
  updatedBy?: string;
}

interface DejaLearningRecord {
  id?: string;
  trigger: string;
  learning: string;
  reason?: string;
  source?: string;
}

interface DejaWorkingStateResponse {
  runId: string;
  state?: {
    goal?: string;
    assumptions?: ReadonlyArray<string>;
    decisions?: ReadonlyArray<{ text: string; status?: string }>;
    open_questions?: ReadonlyArray<string>;
    next_actions?: ReadonlyArray<string>;
    confidence?: number;
  };
}

interface DejaInjectResponse {
  prompt?: string;
  learnings?: ReadonlyArray<DejaLearningRecord>;
  state?: DejaWorkingStateResponse;
}

interface CommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

interface WorkingTreeChangeSet {
  files: ReadonlyArray<string>;
  totalLines: number;
}

interface ScopeValidationResult {
  ok: boolean;
  changes: WorkingTreeChangeSet;
  violation?: string;
}

interface CommitResult {
  created: boolean;
  sha?: string;
  message?: string;
  empty?: boolean;
}

interface ProofSnapshot {
  cwd: string;
  planPath?: string;
  gitHead?: string;
  worktreeDiffHash?: string;
}

interface IterationReport {
  iteration: number;
  timestamp: string;
  identity: RunIdentityEnvelope;
  recall?: MemoryRecall | null;
  firstFailedGoal: {
    id: string;
    title: string;
    summary: string;
  } | null;
  result: PlanRunResult;
  worker?: {
    called: boolean;
    summary?: string;
    changes: ReadonlyArray<WorkerChange>;
    timedOut?: boolean;
    stopped?: boolean;
    scopeViolation?: string;
    debug?: WorkerResult["debug"];
  };
  commit?: CommitResult;
  snapshot?: ProofSnapshot;
}

interface WorkerLoopState {
  result: PlanRunResult;
  status: LoopIterationStatus;
  shouldStop: boolean;
}

interface WorkerInvocationResult {
  result: WorkerResult;
  timedOut: boolean;
}

interface OpenCodeModelCallDebug {
  attempts: number;
  rawAssistantContentExcerpt?: string;
  normalizedAssistantContentExcerpt?: string;
  lastHttpStatus?: number;
}

interface FilepathWorkerRunResponse {
  status: "success" | "error" | "aborted" | "policy_error";
  summary: string;
  events?: ReadonlyArray<unknown>;
  filesTouched?: ReadonlyArray<string>;
  violations?: ReadonlyArray<string>;
  diffSummary?: string | null;
  patch?: string | null;
  commit?: { sha: string; message: string } | null;
  agentId: string;
  runId: string;
  traceId?: string | null;
  workspaceId?: string | null;
  conversationId?: string | null;
  proofRunId?: string | null;
  proofIterationId?: string | null;
  startedAt: number;
  finishedAt: number;
}

interface OpenCodeModelCallResult {
  instruction: OpenCodeInstruction | null;
  debug?: OpenCodeModelCallDebug;
}

type OpenCodeMessageContentPart =
  | { type?: string; text?: string | null }
  | { type?: string; content?: string | null };

type OpenCodeMessageContent = string | null | ReadonlyArray<OpenCodeMessageContentPart>;

interface OpenCodeChatCompletionChoice {
  message?: {
    content?: OpenCodeMessageContent;
  };
}

interface OpenCodeChatCompletionResponse {
  choices?: ReadonlyArray<OpenCodeChatCompletionChoice>;
}

type OpenCodeInstruction =
  | {
    action: "read";
    path: string;
  }
  | {
    action: "write";
    path: string;
    content: string;
  }
  | {
    action: "replace";
    path: string;
    find: string;
    replace: string;
  }
  | {
    action: "exec";
    command: string;
  }
  | {
    action: "done";
    summary: string;
    commitMessage?: string;
    stop?: boolean;
  };

interface CloudflareTailCreateResponse {
  result: {
    id: string;
    url: string;
  };
  success: true;
}

interface CloudflareTailSession {
  ready: () => Promise<void>;
  collect: (timeoutMs: number) => Promise<ReadonlyArray<LogEvent>>;
  close: () => Promise<void>;
}

interface CloudflareTailState {
  lastSeen: number;
  session: CloudflareTailSession;
}

const runCommand = (
  command: string,
  args: ReadonlyArray<string>,
  cwd: string,
): Effect.Effect<CommandResult, never, never> =>
  Effect.tryPromise(() =>
    new Promise<CommandResult>((resolveCommand) => {
      const child = spawn(command, [...args], {
        cwd,
        env: process.env,
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (chunk) => {
        stdout += String(chunk);
      });

      child.stderr?.on("data", (chunk) => {
        stderr += String(chunk);
      });

      child.on("error", (error) => {
        resolveCommand({
          ok: false,
          stdout,
          stderr: error instanceof Error ? error.message : String(error),
          exitCode: null,
        });
      });

      child.on("close", (code) => {
        resolveCommand({
          ok: code === 0,
          stdout,
          stderr,
          exitCode: code,
        });
      });
    }),
  ).pipe(
    Effect.catch(() =>
      Effect.succeed({
        ok: false,
        stdout: "",
        stderr: "command failed unexpectedly",
        exitCode: null,
      }),
    ),
  );

const runCommandWithInput = (
  command: string,
  args: ReadonlyArray<string>,
  cwd: string,
  input: string,
): Effect.Effect<CommandResult, never, never> =>
  Effect.tryPromise(() =>
    new Promise<CommandResult>((resolveCommand) => {
      const child = spawn(command, [...args], {
        cwd,
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (chunk) => {
        stdout += String(chunk);
      });

      child.stderr?.on("data", (chunk) => {
        stderr += String(chunk);
      });

      child.on("error", (error) => {
        resolveCommand({
          ok: false,
          stdout,
          stderr: error instanceof Error ? error.message : String(error),
          exitCode: null,
        });
      });

      child.on("close", (code) => {
        resolveCommand({
          ok: code === 0,
          stdout,
          stderr,
          exitCode: code,
        });
      });

      child.stdin?.end(input);
    }),
  ).pipe(
    Effect.catch(() =>
      Effect.succeed({
        ok: false,
        stdout: "",
        stderr: "command failed unexpectedly",
        exitCode: null,
      }),
    ),
  );

const runCommandBytes = (
  command: string,
  args: ReadonlyArray<string>,
  cwd: string,
): Effect.Effect<{ ok: boolean; stdout: Uint8Array; stderr: string; exitCode: number | null }, never, never> =>
  Effect.tryPromise(() =>
    new Promise<{ ok: boolean; stdout: Uint8Array; stderr: string; exitCode: number | null }>((resolveCommand) => {
      const child = spawn(command, [...args], {
        cwd,
        env: process.env,
      });

      const stdoutChunks: Buffer[] = [];
      let stderr = "";

      child.stdout?.on("data", (chunk) => {
        stdoutChunks.push(Buffer.from(chunk));
      });

      child.stderr?.on("data", (chunk) => {
        stderr += String(chunk);
      });

      child.on("error", (error) => {
        resolveCommand({
          ok: false,
          stdout: new Uint8Array(),
          stderr: error instanceof Error ? error.message : String(error),
          exitCode: null,
        });
      });

      child.on("close", (code) => {
        resolveCommand({
          ok: code === 0,
          stdout: Buffer.concat(stdoutChunks),
          stderr,
          exitCode: code,
        });
      });
    }),
  ).pipe(
    Effect.catch(() =>
      Effect.succeed({
        ok: false,
        stdout: new Uint8Array(),
        stderr: "command failed unexpectedly",
        exitCode: null,
      }),
    ),
  );

const isGitRepository = (cwd: string): Effect.Effect<boolean, never, never> =>
  runCommand("git", ["rev-parse", "--is-inside-work-tree"], cwd).pipe(
    Effect.map((result) => result.ok && result.stdout.trim() === "true"),
  );

const collectWorkingTreeChanges = (
  cwd: string,
): Effect.Effect<WorkingTreeChangeSet, never, never> =>
  Effect.gen(function* () {
    const insideGit = yield* isGitRepository(cwd);
    if (!insideGit) {
      return {
        files: [],
        totalLines: 0,
      };
    }

    const statusResult = yield* runCommand(
      "git",
      ["status", "--porcelain", "--untracked-files=all"],
      cwd,
    );
    if (!statusResult.ok) {
      return {
        files: [],
        totalLines: 0,
      };
    }

    const files = statusResult.stdout
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.length >= 4)
      .map((line) => {
        const rawPath = line.slice(3);
        const renameIndex = rawPath.indexOf(" -> ");
        return normalizePath(renameIndex === -1 ? rawPath : rawPath.slice(renameIndex + 4));
      });

    if (files.length === 0) {
      return {
        files: [],
        totalLines: 0,
      };
    }

    const numstatResult = yield* runCommand(
      "git",
      ["diff", "--numstat", "--relative", "HEAD", "--"],
      cwd,
    );

    const trackedLineCounts = new Map<string, number>();

    if (numstatResult.ok) {
      for (const line of numstatResult.stdout.split(/\r?\n/)) {
        if (!line) {
          continue;
        }
        const [added, removed, path] = line.split("\t");
        if (!path) {
          continue;
        }
        const addedCount = added === "-" ? 0 : Number(added);
        const removedCount = removed === "-" ? 0 : Number(removed);
        trackedLineCounts.set(
          normalizePath(path),
          (Number.isFinite(addedCount) ? addedCount : 0) + (Number.isFinite(removedCount) ? removedCount : 0),
        );
      }
    }

    let totalLines = 0;

    for (const file of files) {
      if (trackedLineCounts.has(file)) {
        totalLines += trackedLineCounts.get(file) ?? 0;
        continue;
      }

      const absolutePath = resolve(cwd, file);
      const existing = yield* Effect.tryPromise(() => stat(absolutePath)).pipe(
        Effect.map(() => true),
        Effect.catch(() => Effect.succeed(false)),
      );

      if (!existing) {
        continue;
      }

      const contents = yield* Effect.tryPromise(() => readFile(absolutePath, "utf8")).pipe(
        Effect.catch(() => Effect.succeed("")),
      );

      totalLines += countLines(contents);
    }

    return {
      files,
      totalLines,
    };
  });

const validateScope = (
  goal: PlanGoal | undefined,
  cwd: string,
): Effect.Effect<ScopeValidationResult, never, never> =>
  collectWorkingTreeChanges(cwd).pipe(
    Effect.map((changes) => {
      const scope = goal?.scope;
      const allowedPaths = (scope?.allowedPaths ?? DEFAULT_ALLOWED_PATHS).map(ensureTrailingSlash);
      const forbiddenPaths = (scope?.forbiddenPaths ?? DEFAULT_FORBIDDEN_PATHS).map(ensureTrailingSlash);
      const maxChangedFiles = scope?.maxChangedFiles;
      const maxChangedLines = scope?.maxChangedLines;

      for (const file of changes.files) {
        const normalized = normalizePath(file);

        if (forbiddenPaths.some((entry) => normalized === entry.slice(0, -1) || normalized.startsWith(entry))) {
          return {
            ok: false,
            changes,
            violation: `scope violation: changed forbidden path ${JSON.stringify(normalized)}`,
          };
        }

        if (allowedPaths.length > 0 && !allowedPaths.some((entry) => normalized === entry.slice(0, -1) || normalized.startsWith(entry))) {
          return {
            ok: false,
            changes,
            violation: `scope violation: changed path outside allowed scope ${JSON.stringify(normalized)}`,
          };
        }
      }

      if (typeof maxChangedFiles === "number" && changes.files.length > maxChangedFiles) {
        return {
          ok: false,
          changes,
          violation: `scope violation: changed ${changes.files.length} files (max ${maxChangedFiles})`,
        };
      }

      if (typeof maxChangedLines === "number" && changes.totalLines > maxChangedLines) {
        return {
          ok: false,
          changes,
          violation: `scope violation: changed ${changes.totalLines} lines (max ${maxChangedLines})`,
        };
      }

      return {
        ok: true,
        changes,
      };
    }),
  );

const writeIterationReport = (
  cwd: string,
  iteration: number,
  entry: IterationReport,
): Effect.Effect<string, never, never> =>
  Effect.gen(function* () {
    const reportDirectory = resolve(cwd, ".gateproof", "iterations");
    const reportPath = resolve(reportDirectory, `${iteration}.json`);
    const latestPath = resolve(cwd, ".gateproof", "latest.json");
    const payload = `${JSON.stringify(entry, null, 2)}\n`;

    yield* Effect.tryPromise(() => mkdir(reportDirectory, { recursive: true })).pipe(
      Effect.catch(() => Effect.void),
    );
    yield* Effect.tryPromise(() => writeFile(reportPath, payload, "utf8")).pipe(
      Effect.catch(() => Effect.void),
    );
    yield* Effect.tryPromise(() => writeFile(latestPath, payload, "utf8")).pipe(
      Effect.catch(() => Effect.void),
    );

    return reportPath;
  });

const captureProofSnapshot = (
  cwd: string,
  planPath?: string,
): Effect.Effect<ProofSnapshot, never, never> =>
  Effect.gen(function* () {
    const snapshot: ProofSnapshot = {
      cwd,
      planPath,
    };
    const insideGit = yield* isGitRepository(cwd);

    if (!insideGit) {
      return snapshot;
    }

    const headResult = yield* runCommand("git", ["rev-parse", "HEAD"], cwd);
    if (headResult.ok) {
      snapshot.gitHead = headResult.stdout.trim();
    }

    const diffResult = yield* runCommandBytes("git", ["diff", "--binary", "HEAD"], cwd);
    if (diffResult.ok) {
      snapshot.worktreeDiffHash = createHash("sha256")
        .update(diffResult.stdout)
        .digest("hex");
    }

    return snapshot;
  });

const createExcerpt = (value: string | null | undefined, maxLength = 1000): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed.length <= maxLength
    ? trimmed
    : `${trimmed.slice(0, maxLength - 1)}…`;
};

const resolveFilepathRunEndpoint = (
  endpoint: string,
  workspaceId: string,
): string => {
  const trimmed = endpoint.trim();
  if (trimmed.includes("/api/workspaces/")) {
    return trimmed;
  }

  return `${trimmed.replace(/\/+$/, "")}/api/workspaces/${workspaceId}/run`;
};

const resolveDejaEndpoint = (endpoint: string, path: string): string =>
  `${endpoint.trim().replace(/\/+$/, "")}${path}`;

const createDejaHeaders = (apiKey?: string): Record<string, string> => ({
  "Content-Type": "application/json",
  ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
});

const createRecallContextText = (context: MemoryRecallContext): string =>
  JSON.stringify({
    cwd: context.cwd,
    planPath: context.planPath,
    proofRunId: context.identity.proofRunId,
    proofIterationId: context.identity.proofIterationId,
    resultSummary: context.result.summary,
    firstFailedGoal: context.firstFailedGoal
      ? {
        id: context.firstFailedGoal.id,
        title: context.firstFailedGoal.title,
        summary: context.firstFailedGoal.summary,
      }
      : null,
    failedGoals: context.failedGoals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      summary: goal.summary,
    })),
  }, null, 2);

const summarizeDejaState = (
  state: DejaWorkingStateResponse | undefined,
): string | undefined => {
  if (!state?.state) {
    return undefined;
  }

  const parts = [
    state.state.goal ? `Goal: ${state.state.goal}` : "",
    state.state.decisions?.length
      ? `Decisions: ${state.state.decisions.map((entry) => entry.text).join("; ")}`
      : "",
    state.state.next_actions?.length
      ? `Next actions: ${state.state.next_actions.join("; ")}`
      : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : undefined;
};

const createWorkingStatePayload = (
  entry: MemoryWorkingStateEntry,
) => ({
  goal: entry.firstFailedGoal
    ? `Fix ${entry.firstFailedGoal.title}`
    : "Keep the proof green",
  decisions: [{
    text: entry.result.summary,
    status: entry.result.status === "pass" ? "complete" : "active",
  }],
  next_actions: entry.firstFailedGoal
    ? [`Address gate ${entry.firstFailedGoal.id}`]
    : ["Finalize the proof run"],
  confidence:
    entry.result.proofStrength === "strong"
      ? 0.9
      : entry.result.proofStrength === "moderate"
        ? 0.7
        : entry.result.proofStrength === "weak"
          ? 0.5
          : 0.3,
});

const createLearningPayload = (entry: MemoryEntry) => {
  const trigger = entry.firstFailedGoal
    ? `proof iteration for gate ${entry.firstFailedGoal.id}`
    : "proof run completed";
  const parts = [
    entry.firstFailedGoal
      ? `First failed gate ${entry.firstFailedGoal.id}: ${entry.firstFailedGoal.summary}.`
      : "All current gates passed.",
    `Proof summary: ${entry.result.summary}.`,
    entry.worker?.summary ? `Worker summary: ${entry.worker.summary}.` : "",
    entry.worker?.scopeViolation ? `Scope violation: ${entry.worker.scopeViolation}.` : "",
    entry.commit?.message ? `Commit message: ${entry.commit.message}.` : "",
  ].filter(Boolean);

  return {
    trigger,
    learning: parts.join(" "),
    confidence:
      entry.result.status === "pass"
        ? 0.9
        : entry.result.status === "fail"
          ? 0.75
          : 0.6,
    reason: "Stored from a Gateproof proof iteration.",
    source: `gateproof:${entry.identity.proofRunId ?? "proof"}:${entry.identity.proofIterationId ?? entry.iteration}`,
  };
};

const deriveWritableRoot = (scope: PlanScope | undefined): string => {
  if (!scope?.allowedPaths || scope.allowedPaths.length !== 1) {
    return ".";
  }

  const candidate = scope.allowedPaths[0];
  if (!candidate || candidate === ".") {
    return ".";
  }

  return candidate.endsWith("/") ? candidate.slice(0, -1) : ".";
};

const readLatestReportExcerpt = (
  latestReportPath?: string,
): Effect.Effect<string | undefined, never, never> =>
  Effect.gen(function* () {
    if (!latestReportPath || !existsSync(latestReportPath)) {
      return undefined;
    }

    const contents = yield* Effect.tryPromise(() => readFile(latestReportPath, "utf8")).pipe(
      Effect.catch(() => Effect.succeed("")),
    );

    return createExcerpt(contents, 16_000);
  });

const createFilepathWorkerTask = (
  context: WorkerContext,
  snapshot: ProofSnapshot,
  latestReportExcerpt?: string,
): string =>
  [
    "You are Gateproof's isolated worker runtime.",
    "Fix only the first failing gate.",
    "Keep changes minimal and stay inside the provided scope.",
    "Edit concrete file paths, not directories.",
    "If the allowed scope is a directory, inspect files inside it and patch the specific file that fixes the gate.",
    "Do not commit.",
    "",
    JSON.stringify({
      repoRoot: context.cwd,
      planPath: context.planPath,
      latestReportPath: context.latestReportPath,
      latestReport: latestReportExcerpt,
      identity: context.identity,
      memoryRecall: context.recall
        ? {
          prompt: context.recall.prompt,
          stateSummary: context.recall.stateSummary,
          learnings: context.recall.learnings,
        }
        : null,
      snapshot,
      activeScope: context.activeScope,
      firstFailedGoal: context.firstFailedGoal
        ? {
          id: context.firstFailedGoal.id,
          title: context.firstFailedGoal.title,
          summary: context.firstFailedGoal.summary,
        }
        : null,
      failedGoals: context.failedGoals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        summary: goal.summary,
      })),
    }, null, 2),
  ].join("\n");

const applyUnifiedPatch = (
  cwd: string,
  patch: string,
): Effect.Effect<CommandResult, never, never> =>
  runCommandWithInput(
    "git",
    ["apply", "--whitespace=nowarn", "--recount"],
    cwd,
    patch,
  );

const createWorkerChangesFromFiles = (
  filesTouched: ReadonlyArray<string> | undefined,
): WorkerChange[] =>
  (filesTouched ?? []).map((path) => ({
    kind: "write" as const,
    path,
    summary: `patched ${path}`,
  }));

const createCommit = (
  cwd: string,
  message: string,
  options: LoopCommitOptions | undefined,
): Effect.Effect<CommitResult, never, never> =>
  Effect.gen(function* () {
    const insideGit = yield* isGitRepository(cwd);
    if (!insideGit || options?.enabled === false) {
      return { created: false };
    }

    yield* runCommand("git", ["add", "-A"], cwd);

    const cachedDiff = yield* runCommand("git", ["diff", "--cached", "--quiet"], cwd);
    const empty = cachedDiff.exitCode === 0;
    const commitArgs = ["commit", "-m", message];

    if (options?.allowEmpty !== false) {
      commitArgs.splice(1, 0, "--allow-empty");
    } else if (empty) {
      return { created: false };
    }

    const commitResult = yield* runCommand("git", commitArgs, cwd);
    if (!commitResult.ok) {
      return { created: false };
    }

    const shaResult = yield* runCommand("git", ["rev-parse", "HEAD"], cwd);

    return {
      created: true,
      sha: shaResult.ok ? shaResult.stdout.trim() : undefined,
      message,
      empty,
    };
  });

const describeStatus = (status: GateStatus): string => {
  switch (status) {
    case "pass":
      return "all gates passed";
    case "fail":
      return "one or more gates failed";
    case "skip":
      return "all gates were skipped";
    case "inconclusive":
      return "evidence was missing or ambiguous";
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseActionToken = (message?: string): string | undefined => {
  if (!message) return undefined;
  const match = message.match(/\baction=([A-Za-z0-9._:-]+)/);
  return match?.[1];
};

const parseStageToken = (message?: string): string | undefined => {
  if (!message) return undefined;
  const match = message.match(/\bstage=([A-Za-z0-9._:-]+)/);
  return match?.[1];
};

const parseCloudflareTailPayload = (payload: unknown): ReadonlyArray<LogEvent> => {
  if (!isRecord(payload) || !Array.isArray(payload.logs)) {
    return [];
  }

  const eventMetadata = isRecord(payload.event)
    ? payload.event
    : undefined;
  const baseMetadata: Record<string, unknown> = {};

  if (typeof payload.outcome === "string") {
    baseMetadata.outcome = payload.outcome;
  }

  if (typeof payload.scriptName === "string") {
    baseMetadata.scriptName = payload.scriptName;
  }

  if (eventMetadata) {
    baseMetadata.event = eventMetadata;
  }

  return payload.logs
    .map((entry): LogEvent | null => {
      if (!isRecord(entry)) {
        return null;
      }

      const message =
        Array.isArray(entry.message)
          ? entry.message
            .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
            .join(" ")
          : typeof entry.message === "string"
            ? entry.message
            : undefined;

      const metadata =
        Object.keys(baseMetadata).length > 0
          ? baseMetadata
          : undefined;

      return {
        timestamp:
          typeof entry.timestamp === "number"
            ? new Date(entry.timestamp).toISOString()
            : typeof entry.timestamp === "string"
              ? entry.timestamp
              : typeof payload.eventTimestamp === "number"
                ? new Date(payload.eventTimestamp).toISOString()
                : undefined,
        level: typeof entry.level === "string" ? entry.level : undefined,
        message,
        action: parseActionToken(message),
        stage: parseStageToken(message),
        metadata,
      };
    })
    .filter((event): event is LogEvent => event !== null);
};

const deriveProofStrength = (
  gate: GateDefinition,
  evidence: GateEvidence,
  status: GateStatus,
): ProofStrength => {
  if (status === "skip") return "none";
  if (evidence.http || (evidence.logs && evidence.logs.length > 0)) return "strong";
  if (evidence.actions.length > 0 && (gate.assert?.length ?? 0) > 0) return "moderate";
  if (evidence.actions.length > 0) return "weak";
  return "none";
};

const matchesActionFilter = (
  gate: GateDefinition,
  actionIncludes?: string,
): boolean => {
  if (!actionIncludes) return true;

  if (gate.observe?.kind === "http" && gate.observe.url.includes(actionIncludes)) {
    return true;
  }

  return gate.act?.some((action) => action.command.includes(actionIncludes)) ?? false;
};

const runExecAction = (
  action: ExecActionDefinition,
): Effect.Effect<ActionResult, never, never> =>
  Effect.tryPromise(() =>
    new Promise<ActionResult>((resolve) => {
      const startedAt = Date.now();
      const child = spawn(action.command, {
        cwd: action.cwd,
        shell: true,
        env: process.env,
      });

      let stdout = "";
      let stderr = "";
      let settled = false;

      const finish = (result: ActionResult) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      child.stdout?.on("data", (chunk) => {
        stdout += String(chunk);
      });

      child.stderr?.on("data", (chunk) => {
        stderr += String(chunk);
      });

      child.on("error", (error) => {
        finish({
          kind: "exec",
          command: action.command,
          ok: false,
          durationMs: Date.now() - startedAt,
          stdout,
          stderr: `${stderr}${error instanceof Error ? error.message : String(error)}`,
          exitCode: null,
        });
      });

      child.on("close", (code) => {
        finish({
          kind: "exec",
          command: action.command,
          ok: code === 0,
          durationMs: Date.now() - startedAt,
          stdout,
          stderr,
          exitCode: code,
        });
      });

      if (action.timeoutMs && action.timeoutMs > 0) {
        setTimeout(() => {
          if (settled) return;
          child.kill("SIGTERM");
          finish({
            kind: "exec",
            command: action.command,
            ok: false,
            durationMs: Date.now() - startedAt,
            stdout,
            stderr: `${stderr}timed out after ${action.timeoutMs}ms`,
            exitCode: null,
          });
        }, action.timeoutMs);
      }
    }),
  ).pipe(
    Effect.catch((error: unknown) =>
      Effect.succeed({
        kind: "exec" as const,
        command: action.command,
        ok: false,
        durationMs: 0,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: null,
      }),
    ),
  );

const runHttpObservation = (
  resource: HttpObserveResourceDefinition,
): Effect.Effect<HttpObservationResult | undefined, never, never> =>
  Effect.tryPromise(async () => {
    const startedAt = Date.now();
    const response = await fetch(resource.url, {
      headers: resource.headers,
    });
    const body = await response.text();
    return {
      kind: "http" as const,
      url: resource.url,
      status: response.status,
      durationMs: Date.now() - startedAt,
      ok: response.ok,
      body,
    };
  }).pipe(Effect.catch(() => Effect.succeed(undefined)));

const createCloudflareTailSession = async (
  resource: CloudflareObserveDefinition,
  startedAt: number,
): Promise<CloudflareTailSession> => {
  const now = Date.now();
  const sinceThreshold = resource.sinceMs
    ? Math.max(startedAt, now - resource.sinceMs)
    : startedAt;

  const createRequest = createRequestTimeout(2_000);
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${resource.accountId}/workers/scripts/${resource.workerName}/tails`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resource.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filters: [] }),
      signal: createRequest.signal,
    },
  ).finally(createRequest.clear);

  if (!response.ok) {
    throw new Error(`Cloudflare tail request failed: ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !isRecord(payload.result) ||
    typeof payload.result.id !== "string" ||
    typeof payload.result.url !== "string"
  ) {
    throw new Error("Cloudflare tail response was missing a websocket URL");
  }

  const tailRecord: CloudflareTailCreateResponse = {
    success: true,
    result: {
      id: payload.result.id,
      url: payload.result.url,
    },
  };
  const collected: LogEvent[] = [];
  let openResolved = false;
  const websocket = new WebSocket(tailRecord.result.url, "trace-v1");
  const messageListener = (event: MessageEvent) => {
    const data = typeof event.data === "string" ? event.data : String(event.data);
    try {
      const payload = JSON.parse(data) as unknown;
      for (const logEvent of parseCloudflareTailPayload(payload)) {
        if (!logEvent.timestamp) {
          collected.push(logEvent);
          continue;
        }
        const timestamp = new Date(logEvent.timestamp).getTime();
        if (Number.isFinite(timestamp) && timestamp >= sinceThreshold) {
          collected.push(logEvent);
        }
      }
    } catch {
      // Ignore malformed tail payloads and continue collecting.
    }
  };

  let readyError: Error | undefined;
  const ready = new Promise<void>((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      readyError = new Error("Cloudflare tail websocket timed out");
      resolve();
    }, 2_000);

    websocket.addEventListener("open", () => {
      if (settled) {
        return;
      }
      try {
        websocket.send(JSON.stringify({ debug: true }));
        settled = true;
        clearTimeout(timeout);
        openResolved = true;
        // Give the tail a brief moment to begin streaming before the first
        // gate action fires. The very first request in a run can arrive
        // immediately after connect, and a too-short warm-up makes the first
        // gate intermittently miss log evidence even when later gates see it.
        // A slightly longer delay keeps the loop bounded while making the
        // first gate reliable.
        setTimeout(() => resolve(), 500);
      } catch (error) {
        settled = true;
        clearTimeout(timeout);
        readyError = error instanceof Error ? error : new Error(String(error));
        resolve();
      }
    });

    websocket.addEventListener("error", () => {
      if (settled) {
        return;
      }
      if (!openResolved) {
        settled = true;
        clearTimeout(timeout);
        readyError = new Error("Cloudflare tail websocket failed to connect");
        resolve();
      }
    });

    websocket.addEventListener("close", () => {
      if (!settled && !openResolved) {
        settled = true;
        clearTimeout(timeout);
        readyError = new Error("Cloudflare tail websocket closed before connecting");
        resolve();
      }
    }, { once: true });
  });

  websocket.addEventListener("message", messageListener);

  const close = async (): Promise<void> => {
    const waitForClose = new Promise<void>((resolve) => {
      websocket.addEventListener("close", () => resolve(), { once: true });
      websocket.addEventListener("error", () => resolve(), { once: true });
    });
    const terminable = websocket as WebSocket & { terminate?: () => void };

    try {
      terminable.terminate?.();
      if (!terminable.terminate) {
        websocket.close();
      }
    } catch {
      try {
        websocket.close();
      } catch {
        // ignore close errors
      }
    }

    await Promise.race([waitForClose, delay(250)]);

    websocket.removeEventListener("message", messageListener);

    // Cloudflare tail sessions expire server-side; skipping explicit deletion here keeps
    // the proof loop bounded and avoids hanging the process on teardown network calls.
  };

  const collect = async (timeoutMs: number): Promise<ReadonlyArray<LogEvent>> => {
    await ready;
    if (readyError) {
      throw readyError;
    }

    // Cloudflare tail events should arrive quickly after the triggering action.
    // If nothing shows up promptly, return empty evidence instead of burning the
    // full gate timeout and making the proof loop feel wedged.
    const effectiveTimeoutMs = Math.min(timeoutMs, 1_500);
    const deadline = Date.now() + effectiveTimeoutMs;
    const pollInterval = Math.max(50, Math.min(resource.pollInterval ?? 250, 1_000));

    while (Date.now() < deadline) {
      if (collected.length > 0) {
        await delay(Math.min(250, Math.max(0, deadline - Date.now())));
        return [...collected];
      }
      await delay(pollInterval);
    }

    return [...collected];
  };

  return {
    ready: async (): Promise<void> => {
      await ready;
      if (readyError) {
        throw readyError;
      }
    },
    collect,
    close,
  };
};

const createReadyCloudflareTailSession = async (
  resource: CloudflareObserveDefinition,
  startedAt: number,
): Promise<CloudflareTailSession> => {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let tailSession: CloudflareTailSession | undefined;

    try {
      tailSession = await createCloudflareTailSession(resource, startedAt);
      await tailSession.ready();
      return tailSession;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (tailSession) {
        await tailSession.close().catch(() => undefined);
      }
      if (attempt === 0) {
        await delay(250);
      }
    }
  }

  throw lastError ?? new Error("Cloudflare tail session failed to become ready");
};

const getCloudflareTailKey = (resource: CloudflareObserveDefinition): string =>
  [
    resource.accountId,
    resource.workerName,
    resource.backend ?? "workers-logs",
  ].join(":");

const runObservation = (
  resource: HttpObserveResourceDefinition,
): Effect.Effect<HttpObservationResult | undefined, never, never> =>
  runHttpObservation(resource);

const extractNumericValue = (
  assertion: NumericDeltaFromEnvAssertionDefinition,
  evidence: GateEvidence,
): number | null => {
  let regex: RegExp;

  try {
    regex = new RegExp(assertion.pattern);
  } catch {
    return null;
  }

  if (assertion.source === "httpBody") {
    const bodyText = evidence.http?.body ?? evidence.actions.map((action) => action.stdout).join("\n");
    const match = bodyText.match(regex);
    if (!match) return null;
    const value = Number(match[1] ?? match[0]);
    return Number.isFinite(value) ? value : null;
  }

  for (const log of evidence.logs ?? []) {
    const message = log.message;
    if (!message) continue;
    const match = message.match(regex);
    if (!match) continue;
    const value = Number(match[1] ?? match[0]);
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
};

const summarizePlan = (
  goals: ReadonlyArray<GateRunResult>,
): Pick<PlanRunResult, "status" | "proofStrength" | "summary"> => {
  const statuses = goals.map((goal) => goal.status);
  let status: GateStatus = "pass";

  if (statuses.length === 0) {
    status = "inconclusive";
  } else if (statuses.every((value) => value === "skip")) {
    status = "skip";
  } else if (statuses.includes("inconclusive")) {
    status = "inconclusive";
  } else if (statuses.includes("fail")) {
    status = "fail";
  } else if (statuses.includes("pass")) {
    status = "pass";
  }

  const proofStrength: ProofStrength =
    goals.some((goal) => goal.proofStrength === "strong")
      ? "strong"
      : goals.some((goal) => goal.proofStrength === "moderate")
        ? "moderate"
        : goals.some((goal) => goal.proofStrength === "weak")
          ? "weak"
          : "none";

  return {
    status,
    proofStrength,
    summary: describeStatus(status),
  };
};

const evaluateGate = (
  goal: PlanGoal,
  cloudflareTails: Map<string, CloudflareTailState>,
): Effect.Effect<GateRunResult, never, never> =>
  Effect.gen(function* () {
    const gate = goal.gate;
    const prerequisites = gate.prerequisites ?? [];

    const missingRequirements = prerequisites
      .filter((prerequisite) => prerequisite.kind === "env" && !process.env[prerequisite.name])
      .map((prerequisite) => prerequisite.reason ?? `missing required env var ${prerequisite.name}`);

    if (missingRequirements.length > 0) {
      return {
        id: goal.id,
        title: goal.title,
        status: "fail" as const,
        proofStrength: "none" as const,
        summary: missingRequirements.join("; "),
        evidence: { actions: [], errors: missingRequirements },
      };
    }

    const startedAt = Date.now();
    const actions: ActionResult[] = [];
    const errors: string[] = [];
    let cloudflareTail: CloudflareTailState | undefined;
    const cloudflareResource =
      gate.observe?.kind === "cloudflare-workers-logs"
        ? gate.observe
        : undefined;

    if (cloudflareResource) {
      const tailKey = getCloudflareTailKey(cloudflareResource);
      const existingTail = cloudflareTails.get(tailKey);

      if (existingTail) {
        cloudflareTail = existingTail;
      } else {
        const readyTail = yield* Effect.tryPromise(() =>
          createReadyCloudflareTailSession(cloudflareResource, startedAt),
        ).pipe(Effect.catch(() => Effect.succeed(undefined)));

        if (readyTail) {
          cloudflareTail = {
            session: readyTail,
            lastSeen: 0,
          };
          cloudflareTails.set(tailKey, cloudflareTail);
        }
      }
    }

    for (const action of gate.act ?? []) {
      const result = yield* runExecAction(action);
      actions.push(result);
      if (!result.ok) {
        errors.push(`action failed: ${result.command}`);
      }
    }

    let http: HttpObservationResult | undefined;
    let logs: ReadonlyArray<LogEvent> | undefined;

    if (gate.observe) {
      const resource = gate.observe;
      if (resource.kind === "http") {
        http = yield* runObservation(resource);
        if (!http) {
          errors.push(`failed to observe ${resource.url}`);
        }
      } else {
        if (cloudflareTail) {
          const collected = yield* Effect.tryPromise(() =>
            cloudflareTail.session.collect(gate.timeoutMs ?? 5_000),
          ).pipe(Effect.catch(() => Effect.succeed(undefined)));

          if (collected) {
            logs = collected.slice(cloudflareTail.lastSeen);
            cloudflareTail.lastSeen = collected.length;
          }
        }

        if (!logs) {
          errors.push(`failed to observe Cloudflare worker ${resource.workerName}`);
        }
      }
    }

    const evidence: GateEvidence = {
      actions,
      http,
      logs,
      errors,
    };

    const assertions = gate.assert ?? [];
    if (assertions.length === 0) {
      return {
        id: goal.id,
        title: goal.title,
        status: "inconclusive",
        proofStrength: deriveProofStrength(gate, evidence, "inconclusive"),
        summary: "no assertions defined",
        evidence,
      };
    }

    const issues: string[] = [];
    let insufficient = false;

    for (const assertion of assertions) {
      if (assertion.kind === "httpResponse") {
        if (!http || !matchesActionFilter(gate, assertion.actionIncludes)) {
          insufficient = true;
          issues.push("missing matching HTTP evidence");
          continue;
        }
        if (http.status !== assertion.status) {
          issues.push(`expected HTTP ${assertion.status}, saw ${http.status}`);
        }
        continue;
      }

      if (assertion.kind === "duration") {
        if (!http || !matchesActionFilter(gate, assertion.actionIncludes)) {
          insufficient = true;
          issues.push("missing timing evidence");
          continue;
        }
        if (http.durationMs > assertion.atMostMs) {
          issues.push(`expected duration <= ${assertion.atMostMs}ms, saw ${http.durationMs}ms`);
        }
        continue;
      }

      if (assertion.kind === "noErrors") {
        if (errors.length > 0) {
          issues.push(errors.join("; "));
        }
        continue;
      }

      if (assertion.kind === "hasAction") {
        if (!logs || logs.length === 0) {
          insufficient = true;
          issues.push("missing log evidence");
          continue;
        }
        const found = logs.some((log) => log.action === assertion.action);
        if (!found) {
          issues.push(`expected action ${assertion.action}`);
        }
        continue;
      }

      if (assertion.kind === "responseBodyIncludes") {
        const bodyText = http?.body ?? actions.map((action) => action.stdout).join("\n");
        if (!bodyText) {
          insufficient = true;
          issues.push("missing response body evidence");
          continue;
        }
        if (!bodyText.includes(assertion.text)) {
          issues.push(`expected response body to include ${JSON.stringify(assertion.text)}`);
        }
        continue;
      }

      if (!process.env[assertion.baselineEnv]) {
        insufficient = true;
        issues.push(`missing baseline env var ${assertion.baselineEnv}`);
        continue;
      }

      const baseline = Number(process.env[assertion.baselineEnv]);
      if (!Number.isFinite(baseline)) {
        issues.push(`baseline env var ${assertion.baselineEnv} is not numeric`);
        continue;
      }

      const measured = extractNumericValue(assertion, evidence);
      if (measured === null) {
        insufficient = true;
        issues.push("missing numeric evidence");
        continue;
      }

      const delta = baseline - measured;
      if (delta < assertion.minimumDelta) {
        issues.push(`expected delta >= ${assertion.minimumDelta}, saw ${delta}`);
      }
    }

    const status: GateStatus =
      insufficient ? "inconclusive" : issues.length > 0 ? "fail" : "pass";

    return {
      id: goal.id,
      title: goal.title,
      status,
      proofStrength: deriveProofStrength(gate, evidence, status),
      summary: issues.length > 0 ? issues.join("; ") : "gate passed",
      evidence,
    };
  });

const selectGoalsThrough = (
  plan: PlanDefinition,
  targetGoalId: string | undefined,
): ReadonlyArray<PlanGoal> => {
  if (!targetGoalId) {
    return plan.goals;
  }

  const index = plan.goals.findIndex((goal) => goal.id === targetGoalId);
  return index === -1 ? plan.goals : plan.goals.slice(0, index + 1);
};

const runPlanOnce = (
  plan: PlanDefinition,
  targetGoalId?: string,
): Effect.Effect<PlanRunResult, never, never> =>
  Effect.gen(function* () {
    const cloudflareTails = new Map<string, CloudflareTailState>();
    const goals: GateRunResult[] = [];
    for (const goal of selectGoalsThrough(plan, targetGoalId)) {
      goals.push(yield* evaluateGate(goal, cloudflareTails));
    }

    for (const tail of cloudflareTails.values()) {
      yield* Effect.tryPromise(() => tail.session.close()).pipe(
        Effect.catch(() => Effect.succeed(undefined)),
      );
    }

    const summary = summarizePlan(goals);
    return {
      ...summary,
      iterations: 1,
      goals,
      cleanupErrors: [],
    };
  });

const resolveLatestReportPath = (cwd: string): string | undefined => {
  const latestPath = resolve(cwd, ".gateproof", "latest.json");
  return existsSync(latestPath) ? latestPath : undefined;
};

const runCleanup = (
  plan: PlanDefinition,
): Effect.Effect<ReadonlyArray<string>, never, never> =>
  Effect.gen(function* () {
    const cleanupErrors: string[] = [];

    for (const action of plan.cleanup?.actions ?? []) {
      const result = yield* runExecAction(action);
      if (!result.ok) {
        cleanupErrors.push(`cleanup failed: ${action.command}`);
      }
    }

    return cleanupErrors;
  });

const withCleanup = (
  plan: PlanDefinition,
  result: PlanRunResult,
): Effect.Effect<PlanRunResult, never, never> =>
  Effect.gen(function* () {
    const cleanupErrors = yield* runCleanup(plan);
    const summary =
      cleanupErrors.length > 0
        ? `${result.summary}; cleanup issues: ${cleanupErrors.join("; ")}`
        : result.summary;

    return {
      ...result,
      summary,
      cleanupErrors,
    };
  });

const invokeIterationCallback = (
  callback: PlanRunLoopOptions["onIteration"],
  status: LoopIterationStatus,
): Effect.Effect<void, never, never> => {
  if (!callback) {
    return Effect.void;
  }

  return Effect.sync(() => {
    callback(status);
  }).pipe(Effect.catch(() => Effect.void));
};

const invokeWorker = (
  worker: LoopWorker,
  context: WorkerContext,
  timeoutMs: number,
): Effect.Effect<WorkerInvocationResult, never, never> => {
  if (!worker) {
    return Effect.succeed({
      result: {
        changes: [],
        summary: "no worker configured",
      },
      timedOut: false,
    });
  }

  return worker(context).pipe(
    Effect.timeout(`${timeoutMs} millis`),
    Effect.map((result) => ({
      result,
      timedOut: false,
    })),
    Effect.catch(() =>
      Effect.succeed({
        result: {
          changes: [],
          summary: `worker timed out after ${timeoutMs}ms`,
          stop: true,
        },
        timedOut: true,
      }),
    ),
  );
};

const createDefaultCommitMessage = (
  firstFailedGoal: GateRunResult | null,
  iteration: number,
): string => {
  if (!firstFailedGoal) {
    return `wip(loop): iteration ${iteration}`;
  }

  return `wip(loop): ${firstFailedGoal.id} iteration ${iteration}`;
};

const createIterationReport = (
  iteration: number,
  identity: RunIdentityEnvelope,
  recall: MemoryRecall | null | undefined,
  result: PlanRunResult,
  firstFailedGoal: GateRunResult | null,
  workerEntry: IterationReport["worker"] | undefined,
  commit: CommitResult | undefined,
  snapshot: ProofSnapshot,
): IterationReport => ({
  iteration,
  timestamp: new Date().toISOString(),
  identity,
  recall,
  firstFailedGoal:
    firstFailedGoal
      ? {
        id: firstFailedGoal.id,
        title: firstFailedGoal.title,
        summary: firstFailedGoal.summary,
      }
      : null,
  result,
  worker: workerEntry,
  commit,
  snapshot,
});

const createIterationIdentity = (
  proofRunId: string,
  iteration: number,
): RunIdentityEnvelope => ({
  traceId: crypto.randomUUID(),
  workspaceId: null,
  conversationId: null,
  runId: null,
  proofRunId,
  proofIterationId: `${proofRunId}:${iteration}`,
});

const mergeRunIdentity = (
  base: RunIdentityEnvelope,
  next?: Partial<RunIdentityEnvelope>,
): RunIdentityEnvelope => ({
  traceId: next?.traceId ?? base.traceId,
  workspaceId: next?.workspaceId ?? base.workspaceId,
  conversationId: next?.conversationId ?? base.conversationId,
  runId: next?.runId ?? base.runId,
  proofRunId: next?.proofRunId ?? base.proofRunId,
  proofIterationId: next?.proofIterationId ?? base.proofIterationId,
});

const recallToStateSummary = (recall: MemoryRecall | null | undefined): string | undefined => {
  if (!recall) return undefined;
  if (recall.stateSummary?.trim()) return recall.stateSummary.trim();
  if (recall.prompt?.trim()) return createExcerpt(recall.prompt, 800);
  return undefined;
};

const invokeMemoryRecall = (
  memory: MemoryRuntime | undefined,
  context: MemoryRecallContext,
): Effect.Effect<MemoryRecall | null, never, never> =>
  memory?.recallIteration
    ? memory.recallIteration(context).pipe(Effect.catch(() => Effect.succeed(null)))
    : Effect.succeed(null);

const writeMemoryIteration = (
  memory: MemoryRuntime | undefined,
  entry: MemoryEntry,
): Effect.Effect<void, never, never> =>
  memory
    ? memory.writeIteration(entry).pipe(Effect.catch(() => Effect.void))
    : Effect.void;

const updateMemoryWorkingState = (
  memory: MemoryRuntime | undefined,
  entry: MemoryWorkingStateEntry,
): Effect.Effect<void, never, never> =>
  memory?.updateWorkingState
    ? memory.updateWorkingState(entry).pipe(Effect.catch(() => Effect.void))
    : Effect.void;

const resolveMemoryWorkingState = (
  memory: MemoryRuntime | undefined,
  entry: MemoryResolutionEntry,
): Effect.Effect<void, never, never> =>
  memory?.resolveWorkingState
    ? memory.resolveWorkingState(entry).pipe(Effect.catch(() => Effect.void))
    : Effect.void;

const runPlanLoop = (
  plan: PlanDefinition,
  options: PlanRunLoopOptions = {},
): Effect.Effect<PlanRunResult, never, never> =>
  Effect.gen(function* () {
    const maxIterations = options.maxIterations ?? plan.loop?.maxIterations ?? 1;
    const cwd = resolve(options.cwd ?? process.cwd());
    const workerTimeoutMs = options.workerTimeoutMs ?? 10 * 60 * 1000;
    const proofRunId = crypto.randomUUID();
    let lastIdentity = createIterationIdentity(proofRunId, 1);
    let rerunTargetGoalId: string | undefined;
    let iteration = 0;
    let latest: PlanRunResult = {
      status: "inconclusive",
      proofStrength: "none",
      iterations: 0,
      goals: [],
      summary: "loop has not run",
      cleanupErrors: [],
    };

    while (iteration < maxIterations) {
      iteration += 1;
      let identity = createIterationIdentity(proofRunId, iteration);
      lastIdentity = identity;
      const result = yield* runPlanOnce(plan, rerunTargetGoalId);
      latest = {
        ...result,
        iterations: iteration,
      };
      const firstFailedGoal = latest.goals.find((goal) => goal.status !== "pass") ?? null;
      const recall = yield* invokeMemoryRecall(options.memory, {
        iteration,
        cwd,
        planPath: options.planPath,
        plan,
        result: latest,
        failedGoals: latest.goals.filter((goal) => goal.status !== "pass"),
        firstFailedGoal,
        identity,
      });
      const finalizeWithoutWorker = (
        resultToFinalize: PlanRunResult,
        workerEntry?: IterationReport["worker"],
        commit?: CommitResult,
        persistIterationMemory = false,
      ): Effect.Effect<PlanRunResult, never, never> =>
        Effect.gen(function* () {
          const finalizedResult = yield* withCleanup(plan, resultToFinalize);
          const finalizedFirstFailedGoal =
            finalizedResult.goals.find((goal) => goal.status !== "pass") ?? null;
          const snapshot = yield* captureProofSnapshot(cwd, options.planPath);
          const report = createIterationReport(
            iteration,
            identity,
            recall,
            finalizedResult,
            finalizedFirstFailedGoal,
            workerEntry,
            commit,
            snapshot,
          );
          yield* writeIterationReport(cwd, iteration, report);
          if (!persistIterationMemory) {
            yield* writeMemoryIteration(options.memory, {
              iteration,
              timestamp: report.timestamp,
              identity,
              recall,
              firstFailedGoal: report.firstFailedGoal,
              result: finalizedResult,
              worker: workerEntry,
              commit,
            });
          }
          yield* resolveMemoryWorkingState(options.memory, {
            timestamp: report.timestamp,
            identity,
            result: finalizedResult,
            firstFailedGoal: finalizedFirstFailedGoal,
          });
          return finalizedResult;
        });

      if (latest.status === "pass" || latest.status === "skip") {
        return yield* finalizeWithoutWorker(latest);
      }

      if (!options.worker && plan.loop?.stopOnFailure && latest.status === "fail") {
        return yield* finalizeWithoutWorker(latest);
      }

      if (iteration >= maxIterations || !options.worker) {
        return yield* finalizeWithoutWorker(latest);
      }

      const failedGoals = latest.goals.filter((goal) => goal.status !== "pass");
      if (options.rerunFailedGoalPrefix && !rerunTargetGoalId && firstFailedGoal?.id) {
        rerunTargetGoalId = firstFailedGoal.id;
      }
      const targetGoal = firstFailedGoal
        ? plan.goals.find((goal) => goal.id === firstFailedGoal.id)
        : undefined;
      const workerContext: WorkerContext = {
        iteration,
        plan,
        result: latest,
        failedGoals,
        firstFailedGoal,
        cwd,
        planPath: options.planPath,
        activeScope: targetGoal?.scope,
        latestReportPath: resolveLatestReportPath(cwd),
        identity,
        recall,
      };
      const workerInvocation = yield* invokeWorker(
        options.worker,
        workerContext,
        workerTimeoutMs,
      );
      identity = mergeRunIdentity(identity, workerInvocation.result.identity);
      lastIdentity = identity;
      const scopeValidation = yield* validateScope(targetGoal, cwd);
      const scopeViolation = scopeValidation.ok ? undefined : scopeValidation.violation;
      const workerEntry: IterationReport["worker"] = {
        called: true,
        summary: workerInvocation.result.summary,
        changes: workerInvocation.result.changes,
        timedOut: workerInvocation.timedOut || undefined,
        stopped: workerInvocation.result.stop || undefined,
        scopeViolation,
        debug: workerInvocation.result.debug,
      };
      const commitMessage =
        workerInvocation.result.commitMessage ??
        createDefaultCommitMessage(firstFailedGoal, iteration);
      const commit = yield* createCommit(cwd, commitMessage, options.commit);
      const report = createIterationReport(
        iteration,
        identity,
        recall,
        latest,
        firstFailedGoal,
        workerEntry,
        commit,
        yield* captureProofSnapshot(cwd, options.planPath),
      );
      const reportPath = yield* writeIterationReport(cwd, iteration, report);
      yield* writeMemoryIteration(options.memory, {
        iteration,
        timestamp: report.timestamp,
        identity,
        recall,
        firstFailedGoal: report.firstFailedGoal,
        result: latest,
        worker: workerEntry,
        commit,
      });
      yield* updateMemoryWorkingState(options.memory, {
        timestamp: report.timestamp,
        identity,
        result: latest,
        firstFailedGoal,
      });

      const iterationStatus: LoopIterationStatus = {
        iteration,
        identity,
        recall,
        result: latest,
        firstFailedGoal,
        workerCalled: true,
        workerSummary: workerInvocation.result.summary,
        committed: commit.created,
        commitSha: commit.sha,
        reportPath,
      };
      yield* invokeIterationCallback(options.onIteration, iterationStatus);

      if (!scopeValidation.ok) {
        return yield* finalizeWithoutWorker({
          ...latest,
          status: "fail",
          summary: scopeViolation ?? latest.summary,
        }, workerEntry, commit, true);
      }

      if (workerInvocation.result.stop) {
        return yield* finalizeWithoutWorker(latest, workerEntry, commit, true);
      }
    }

    const finalizedResult = yield* withCleanup(plan, latest);
    const finalFailedGoal = finalizedResult.goals.find((goal) => goal.status !== "pass") ?? null;
    const identity = lastIdentity;
    const snapshot = yield* captureProofSnapshot(cwd, options.planPath);
    const report = createIterationReport(
      iteration,
      identity,
      null,
      finalizedResult,
      finalFailedGoal,
      undefined,
      undefined,
      snapshot,
    );
    yield* writeIterationReport(cwd, iteration, report);
    yield* writeMemoryIteration(options.memory, {
      iteration,
      timestamp: report.timestamp,
      identity,
      recall: null,
      firstFailedGoal: report.firstFailedGoal,
      result: finalizedResult,
    });
    yield* resolveMemoryWorkingState(options.memory, {
      timestamp: report.timestamp,
      identity,
      result: finalizedResult,
      firstFailedGoal: finalFailedGoal,
    });
    return finalizedResult;
  });

const extractJsonCandidate = (content: string): string | null => {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && typeof fenced[1] === "string") {
    return fenced[1].trim();
  }

  const start = content.indexOf("{");
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < content.length; index += 1) {
    const char = content[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return content.slice(start, index + 1).trim();
      }
    }
  }

  return null;
};

const parseOpenCodeInstruction = (content: string): OpenCodeInstruction | null => {
  try {
    const parsed: unknown = JSON.parse(content);
    if (!isRecord(parsed) || typeof parsed.action !== "string") {
      const candidate = extractJsonCandidate(content);
      if (!candidate || candidate === content) {
        return null;
      }
      return parseOpenCodeInstruction(candidate);
    }

    switch (parsed.action) {
      case "read":
        return typeof parsed.path === "string"
          ? { action: "read", path: parsed.path }
          : null;
      case "write":
        return typeof parsed.path === "string" && typeof parsed.content === "string"
          ? { action: "write", path: parsed.path, content: parsed.content }
          : null;
      case "replace":
        return typeof parsed.path === "string" &&
          typeof parsed.find === "string" &&
          typeof parsed.replace === "string"
          ? {
            action: "replace",
            path: parsed.path,
            find: parsed.find,
            replace: parsed.replace,
          }
          : null;
      case "exec":
        return typeof parsed.command === "string"
          ? { action: "exec", command: parsed.command }
          : null;
      case "done":
        return typeof parsed.summary === "string"
          ? {
            action: "done",
            summary: parsed.summary,
            commitMessage: typeof parsed.commitMessage === "string" ? parsed.commitMessage : undefined,
            stop: parsed.stop === true,
          }
          : null;
      default:
        return null;
    }
  } catch {
    const candidate = extractJsonCandidate(content);
    if (!candidate || candidate === content) {
      return null;
    }
    return parseOpenCodeInstruction(candidate);
  }
};

const normalizeOpenCodeMessageContent = (
  content: OpenCodeMessageContent | undefined,
): string | null => {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const parts = content
    .map((entry: OpenCodeMessageContentPart) => {
      if (!entry || typeof entry !== "object") {
        return "";
      }

      if ("text" in entry && typeof entry.text === "string") {
        return entry.text;
      }

      if ("content" in entry && typeof entry.content === "string") {
        return entry.content;
      }

      return "";
    })
    .filter((part: string) => part.length > 0);

  return parts.length > 0 ? parts.join("\n") : null;
};

const callOpenCodeModel = (
  options: OpenCodeWorkerOptions,
  messages: ReadonlyArray<{ role: "system" | "user" | "assistant"; content: string }>,
): Effect.Effect<OpenCodeModelCallResult, never, never> => {
  const endpoint = options.endpoint;
  if (!endpoint) {
    return Effect.succeed({
      instruction: null,
    });
  }

  return Effect.tryPromise(async () => {
    let lastDebug: OpenCodeModelCallDebug | undefined;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: options.model ?? "gpt-5.3-codex",
          messages,
        }),
      });

      if (!response.ok) {
        lastDebug = {
          attempts: attempt + 1,
          lastHttpStatus: response.status,
        };
        continue;
      }

      const payload = (await response.json()) as OpenCodeChatCompletionResponse;
      const content = normalizeOpenCodeMessageContent(payload.choices?.[0]?.message?.content);
      const instruction = typeof content === "string" ? parseOpenCodeInstruction(content) : null;
      if (instruction) {
        return {
          instruction,
          debug: {
            attempts: attempt + 1,
          },
        };
      }

      const rawContent = payload.choices?.[0]?.message?.content;
      lastDebug = {
        attempts: attempt + 1,
        lastHttpStatus: response.status,
        rawAssistantContentExcerpt: createExcerpt(
          typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent),
        ),
        normalizedAssistantContentExcerpt: createExcerpt(content),
      };
    }

    return {
      instruction: null,
      debug: lastDebug,
    };
  }).pipe(Effect.catch(() => Effect.succeed({
    instruction: null,
  })));
};

const executeOpenCodeInstruction = (
  instruction: OpenCodeInstruction,
  context: WorkerContext,
): Effect.Effect<{ response: string; changes: ReadonlyArray<WorkerChange>; done?: WorkerResult }, never, never> =>
  Effect.gen(function* () {
    if (instruction.action === "done") {
      return {
        response: "completed",
        changes: [],
        done: {
          changes: [],
          summary: instruction.summary,
          commitMessage: instruction.commitMessage,
          stop: instruction.stop,
        },
      };
    }

    if (instruction.action === "exec") {
      const result = yield* runCommand("zsh", ["-lc", instruction.command], context.cwd);
      return {
        response: JSON.stringify({
          ok: result.ok,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        }),
        changes: [{
          kind: "exec",
          summary: instruction.command,
        }],
      };
    }

    const targetPath = normalizePath(instruction.path);
    if (!isPathInside(context.cwd, targetPath)) {
      return {
        response: JSON.stringify({ error: "path is outside cwd" }),
        changes: [],
      };
    }

    const absolutePath = resolve(context.cwd, targetPath);

    if (instruction.action === "read") {
      const contents = yield* Effect.tryPromise(() => readFile(absolutePath, "utf8")).pipe(
        Effect.catch(() => Effect.succeed("")),
      );
      return {
        response: contents,
        changes: [],
      };
    }

    if (instruction.action === "write") {
      yield* Effect.tryPromise(() => mkdir(dirname(absolutePath), { recursive: true })).pipe(
        Effect.catch(() => Effect.void),
      );
      yield* Effect.tryPromise(() => writeFile(absolutePath, instruction.content, "utf8")).pipe(
        Effect.catch(() => Effect.void),
      );
      return {
        response: "ok",
        changes: [{
          kind: "write",
          path: targetPath,
          summary: `wrote ${targetPath}`,
        }],
      };
    }

    const existing = yield* Effect.tryPromise(() => readFile(absolutePath, "utf8")).pipe(
      Effect.catch(() => Effect.succeed("")),
    );
    if (!existing.includes(instruction.find)) {
      return {
        response: JSON.stringify({ error: "target text not found" }),
        changes: [],
      };
    }

    const updated = existing.replace(instruction.find, instruction.replace);
    yield* Effect.tryPromise(() => writeFile(absolutePath, updated, "utf8")).pipe(
      Effect.catch(() => Effect.void),
    );
    return {
      response: "ok",
      changes: [{
        kind: "replace",
        path: targetPath,
        summary: `updated ${targetPath}`,
      }],
    };
  });

export const createFilepathWorker = (
  options: FilepathWorkerOptions,
): LoopWorker =>
  (context) =>
    Effect.gen(function* () {
      const snapshot = yield* captureProofSnapshot(context.cwd, context.planPath);
      const latestReportExcerpt = yield* readLatestReportExcerpt(context.latestReportPath);
      const response = yield* Effect.tryPromise(() => {
        const timeout = createRequestTimeout(options.timeoutMs ?? 10 * 60 * 1000);
        return fetch(resolveFilepathRunEndpoint(options.endpoint, options.workspaceId), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
          },
          body: JSON.stringify({
            content: createFilepathWorkerTask(context, snapshot, latestReportExcerpt),
            harnessId: options.harnessId,
            model: options.model,
            identity: {
              traceId: context.identity.traceId,
              proofRunId: context.identity.proofRunId,
              proofIterationId: context.identity.proofIterationId,
            },
            scope: {
              allowedPaths: context.activeScope?.allowedPaths ?? [...DEFAULT_ALLOWED_PATHS],
              forbiddenPaths: context.activeScope?.forbiddenPaths ?? [...DEFAULT_FORBIDDEN_PATHS],
              toolPermissions: ["inspect", "search", "run", "write"],
              writableRoot: deriveWritableRoot(context.activeScope),
            },
          }),
          signal: timeout.signal,
        }).finally(timeout.clear);
      }).pipe(
        Effect.catch(() => Effect.succeed(null)),
      );

      if (!response) {
        return {
          changes: [],
          summary: "filepath worker request failed",
          stop: true,
        };
      }

      const payload = yield* Effect.tryPromise(() => response.json() as Promise<FilepathWorkerRunResponse>).pipe(
        Effect.catch(() => Effect.succeed(null)),
      );

      if (!response.ok || !payload) {
        return {
          changes: [],
          summary: `filepath worker request failed with status ${response.status}`,
          stop: true,
          debug: {
            lastHttpStatus: response.status,
          },
        };
      }

      const violations = payload.violations ?? [];
      if (payload.status !== "success" || violations.length > 0) {
        return {
          changes: [],
          summary: violations.length > 0
            ? `${payload.summary} (${violations.join("; ")})`
            : payload.summary,
          stop: true,
          debug: {
            lastHttpStatus: response.status,
          },
        };
      }

      const patch = typeof payload.patch === "string" ? payload.patch : "";
      if (patch.trim().length === 0 && (payload.filesTouched?.length ?? 0) > 0) {
        return {
          changes: [],
          summary: "filepath worker reported file changes but did not return a patch",
          stop: true,
          debug: {
            lastHttpStatus: response.status,
          },
        };
      }

      if (patch.trim().length > 0) {
        const applied = yield* applyUnifiedPatch(context.cwd, patch);
        if (!applied.ok) {
          const detail = createExcerpt(applied.stderr || applied.stdout, 600);
          return {
            changes: [],
            summary: detail
              ? `failed to apply filepath worker patch: ${detail}`
              : "failed to apply filepath worker patch",
            stop: true,
            debug: {
              lastHttpStatus: response.status,
            },
          };
        }
      }

      return {
        changes: createWorkerChangesFromFiles(payload.filesTouched),
        summary: payload.summary,
        identity: {
          traceId: payload.traceId ?? context.identity.traceId,
          workspaceId: payload.workspaceId ?? options.workspaceId,
          conversationId: payload.conversationId ?? payload.agentId,
          runId: payload.runId,
          proofRunId: payload.proofRunId ?? context.identity.proofRunId,
          proofIterationId: payload.proofIterationId ?? context.identity.proofIterationId,
        },
        debug: {
          lastHttpStatus: response.status,
        },
      };
    }).pipe(
      Effect.catch(() =>
        Effect.succeed({
          changes: [],
          summary: "filepath worker failed unexpectedly",
          stop: true,
        }),
      ),
    );

export const createDejaMemoryRuntime = (
  options: DejaMemoryOptions,
): MemoryRuntime => ({
  recallIteration: (context) =>
    Effect.tryPromise(async () => {
      const proofRunId = context.identity.proofRunId;
      if (!proofRunId) {
        return null;
      }

      const response = await fetch(resolveDejaEndpoint(options.endpoint, "/inject"), {
        method: "POST",
        headers: createDejaHeaders(options.apiKey),
        body: JSON.stringify({
          scopes: [options.scope],
          context: createRecallContextText(context),
          limit: options.recallLimit ?? 4,
          format: "learnings",
          includeState: true,
          runId: proofRunId,
          identity: context.identity,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json().catch(() => null)) as DejaInjectResponse | null;
      if (!payload) {
        return null;
      }

      const learnings = (payload.learnings ?? []).map((entry) => ({
        id: entry.id,
        trigger: entry.trigger,
        learning: entry.learning,
        reason: entry.reason,
        source: entry.source,
      }));

      const stateSummary = summarizeDejaState(payload.state);
      if (learnings.length === 0 && !payload.prompt && !stateSummary) {
        return null;
      }

      return {
        prompt: payload.prompt,
        learnings,
        stateSummary,
        raw: payload,
      };
    }).pipe(
      Effect.catch(() => Effect.succeed(null)),
    ),
  writeIteration: (entry) =>
    Effect.tryPromise(async () => {
      const payload = createLearningPayload(entry);
      await fetch(resolveDejaEndpoint(options.endpoint, "/learn"), {
        method: "POST",
        headers: createDejaHeaders(options.apiKey),
        body: JSON.stringify({
          scope: options.scope,
          ...payload,
          identity: entry.identity,
        }),
      });
    }).pipe(
      Effect.catch(() => Effect.void),
    ),
  updateWorkingState: (entry) =>
    Effect.tryPromise(async () => {
      const proofRunId = entry.identity.proofRunId;
      if (!proofRunId) {
        return;
      }

      await fetch(resolveDejaEndpoint(options.endpoint, `/state/${encodeURIComponent(proofRunId)}`), {
        method: "PUT",
        headers: createDejaHeaders(options.apiKey),
        body: JSON.stringify({
          ...createWorkingStatePayload(entry),
          updatedBy: options.updatedBy ?? "gateproof",
          changeSummary: `proof iteration ${entry.identity.proofIterationId ?? entry.timestamp}`,
          identity: entry.identity,
        }),
      });
    }).pipe(
      Effect.catch(() => Effect.void),
    ),
  resolveWorkingState: (entry) =>
    Effect.tryPromise(async () => {
      const proofRunId = entry.identity.proofRunId;
      if (!proofRunId) {
        return;
      }

      await fetch(resolveDejaEndpoint(options.endpoint, `/state/${encodeURIComponent(proofRunId)}/resolve`), {
        method: "POST",
        headers: createDejaHeaders(options.apiKey),
        body: JSON.stringify({
          persistToLearn: false,
          updatedBy: options.updatedBy ?? "gateproof",
          scope: options.scope,
          identity: entry.identity,
        }),
      });
    }).pipe(
      Effect.catch(() => Effect.void),
    ),
});

export const createOpenCodeWorker = (
  options: OpenCodeWorkerOptions,
): LoopWorker =>
  (context) =>
    Effect.gen(function* () {
      const maxSteps = Math.max(1, options.maxSteps ?? 4);
      const systemPrompt =
        options.prompt ??
        (
          "You are Gateproof's built-in worker. Fix only the first failing gate. " +
          "Do not edit the objective files unless the active scope explicitly allows them. " +
          "Return exactly one JSON object with an action: read, write, replace, exec, or done. " +
          "Keep changes minimal and stay inside the active scope."
        );
      const initialContext = JSON.stringify({
        repoRoot: context.cwd,
        planPath: context.planPath,
        latestReportPath: context.latestReportPath,
        identity: context.identity,
        memoryRecall: context.recall
          ? {
            prompt: context.recall.prompt,
            stateSummary: context.recall.stateSummary,
            learnings: context.recall.learnings,
          }
          : null,
        activeScope: context.activeScope,
        firstFailedGoal: context.firstFailedGoal
          ? {
            id: context.firstFailedGoal.id,
            title: context.firstFailedGoal.title,
            summary: context.firstFailedGoal.summary,
          }
          : null,
        failedGoals: context.failedGoals.map((goal) => ({
          id: goal.id,
          title: goal.title,
          summary: goal.summary,
        })),
      }, null, 2);

      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
        { role: "user", content: initialContext },
      ];
      const changes: WorkerChange[] = [];

      for (let step = 0; step < maxSteps; step += 1) {
        const modelResult = yield* callOpenCodeModel(options, messages);
        const instruction = modelResult.instruction;
        if (!instruction) {
          return {
            changes,
            summary: "worker did not return a usable instruction",
            stop: true,
            debug: modelResult.debug,
          };
        }

        messages.push({
          role: "assistant",
          content: JSON.stringify(instruction),
        });

        const execution = yield* executeOpenCodeInstruction(instruction, context);
        changes.push(...execution.changes);

        if (execution.done) {
          return {
            ...execution.done,
            changes: [...changes, ...execution.done.changes],
          };
        }

        messages.push({
          role: "user",
          content: execution.response,
        });
      }

      return {
        changes,
        summary: "worker hit the step limit without completing",
        stop: true,
      };
    }).pipe(Effect.timeout(`${options.timeoutMs ?? 10 * 60 * 1000} millis`)).pipe(
      Effect.catch(() =>
        Effect.succeed({
          changes: [],
          summary: `worker timed out after ${options.timeoutMs ?? 10 * 60 * 1000}ms`,
          stop: true,
        }),
      ),
    );

export const Gate = {
  define(definition: GateDefinition): GateDefinition {
    return definition;
  },
};

export const Plan = {
  define(definition: PlanDefinition): PlanDefinition {
    return definition;
  },
  run(plan: PlanDefinition): Effect.Effect<PlanRunResult, never, never> {
    return runPlanOnce(plan).pipe(Effect.flatMap((result) => withCleanup(plan, result)));
  },
  runLoop(
    plan: PlanDefinition,
    options?: PlanRunLoopOptions,
  ): Effect.Effect<PlanRunResult, never, never> {
    return runPlanLoop(plan, options);
  },
};

export const Act = {
  exec(
    command: string,
    options: Omit<ExecActionDefinition, "kind" | "command"> = {},
  ): ExecActionDefinition {
    return {
      kind: "exec",
      command,
      ...options,
    };
  },
};

export const Assert = {
  httpResponse(
    definition: Omit<HttpResponseAssertionDefinition, "kind">,
  ): HttpResponseAssertionDefinition {
    return {
      kind: "httpResponse",
      ...definition,
    };
  },
  duration(
    definition: Omit<DurationAssertionDefinition, "kind">,
  ): DurationAssertionDefinition {
    return {
      kind: "duration",
      ...definition,
    };
  },
  noErrors(): NoErrorsAssertionDefinition {
    return { kind: "noErrors" };
  },
  hasAction(action: string): HasActionAssertionDefinition {
    return {
      kind: "hasAction",
      action,
    };
  },
  responseBodyIncludes(text: string): ResponseBodyIncludesAssertionDefinition {
    return {
      kind: "responseBodyIncludes",
      text,
    };
  },
  numericDeltaFromEnv(
    definition: Omit<NumericDeltaFromEnvAssertionDefinition, "kind">,
  ): NumericDeltaFromEnvAssertionDefinition {
    return {
      kind: "numericDeltaFromEnv",
      ...definition,
    };
  },
};

export const Require = {
  env(name: string, reason?: string): EnvPrerequisiteDefinition {
    return {
      kind: "env",
      name,
      reason,
    };
  },
};

export const createHttpObserveResource = (
  definition: Omit<HttpObserveResourceDefinition, "kind">,
): HttpObserveResourceDefinition => ({
  kind: "http",
  ...definition,
});
