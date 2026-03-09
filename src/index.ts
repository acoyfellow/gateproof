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
}

export interface WorkerRuntime {
  runWorker(context: WorkerContext): Effect.Effect<WorkerResult, never, never>;
}

export interface MemoryEntry {
  iteration: number;
  timestamp: string;
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

export interface MemoryRuntime {
  writeIteration(entry: MemoryEntry): Effect.Effect<void, never, never>;
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

interface OpenCodeChatCompletionChoice {
  message?: {
    content?: string | null;
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
  result: PlanRunResult,
  firstFailedGoal: GateRunResult | null,
  workerEntry: IterationReport["worker"] | undefined,
  commit: CommitResult | undefined,
  snapshot: ProofSnapshot,
): IterationReport => ({
  iteration,
  timestamp: new Date().toISOString(),
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

const runPlanLoop = (
  plan: PlanDefinition,
  options: PlanRunLoopOptions = {},
): Effect.Effect<PlanRunResult, never, never> =>
  Effect.gen(function* () {
    const maxIterations = options.maxIterations ?? plan.loop?.maxIterations ?? 1;
    const cwd = resolve(options.cwd ?? process.cwd());
    const workerTimeoutMs = options.workerTimeoutMs ?? 10 * 60 * 1000;
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
      const result = yield* runPlanOnce(plan, rerunTargetGoalId);
      latest = {
        ...result,
        iterations: iteration,
      };
      const firstFailedGoal = latest.goals.find((goal) => goal.status !== "pass") ?? null;
      const finalizeWithoutWorker = (
        resultToFinalize: PlanRunResult,
        workerEntry?: IterationReport["worker"],
        commit?: CommitResult,
      ): Effect.Effect<PlanRunResult, never, never> =>
        Effect.gen(function* () {
          const finalizedResult = yield* withCleanup(plan, resultToFinalize);
          const snapshot = yield* captureProofSnapshot(cwd, options.planPath);
          const report = createIterationReport(
            iteration,
            finalizedResult,
            firstFailedGoal,
            workerEntry,
            commit,
            snapshot,
          );
          yield* writeIterationReport(cwd, iteration, report);
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
      };
      const workerInvocation = yield* invokeWorker(
        options.worker,
        workerContext,
        workerTimeoutMs,
      );
      const scopeValidation = yield* validateScope(targetGoal, cwd);
      const scopeViolation = scopeValidation.ok ? undefined : scopeValidation.violation;
      const workerEntry: IterationReport["worker"] = {
        called: true,
        summary: workerInvocation.result.summary,
        changes: workerInvocation.result.changes,
        timedOut: workerInvocation.timedOut || undefined,
        stopped: workerInvocation.result.stop || undefined,
        scopeViolation,
      };
      const commitMessage =
        workerInvocation.result.commitMessage ??
        createDefaultCommitMessage(firstFailedGoal, iteration);
      const commit = yield* createCommit(cwd, commitMessage, options.commit);
      const report = createIterationReport(
        iteration,
        latest,
        firstFailedGoal,
        workerEntry,
        commit,
        yield* captureProofSnapshot(cwd, options.planPath),
      );
      const reportPath = yield* writeIterationReport(cwd, iteration, report);
      if (options.memory) {
        yield* options.memory.writeIteration({
          iteration,
          timestamp: report.timestamp,
          firstFailedGoal: report.firstFailedGoal,
          result: latest,
          worker: workerEntry,
          commit,
        }).pipe(Effect.catch(() => Effect.void));
      }

      const iterationStatus: LoopIterationStatus = {
        iteration,
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
        }, workerEntry, commit);
      }

      if (workerInvocation.result.stop) {
        return yield* finalizeWithoutWorker(latest, workerEntry, commit);
      }
    }

    const finalizedResult = yield* withCleanup(plan, latest);
    const finalFailedGoal = finalizedResult.goals.find((goal) => goal.status !== "pass") ?? null;
    const snapshot = yield* captureProofSnapshot(cwd, options.planPath);
    const report = createIterationReport(
      iteration,
      finalizedResult,
      finalFailedGoal,
      undefined,
      undefined,
      snapshot,
    );
    yield* writeIterationReport(cwd, iteration, report);
    return finalizedResult;
  });

const parseOpenCodeInstruction = (content: string): OpenCodeInstruction | null => {
  try {
    const parsed: unknown = JSON.parse(content);
    if (!isRecord(parsed) || typeof parsed.action !== "string") {
      return null;
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
    return null;
  }
};

const callOpenCodeModel = (
  options: OpenCodeWorkerOptions,
  messages: ReadonlyArray<{ role: "system" | "user" | "assistant"; content: string }>,
): Effect.Effect<OpenCodeInstruction | null, never, never> => {
  const endpoint = options.endpoint;
  if (!endpoint) {
    return Effect.succeed(null);
  }

  return Effect.tryPromise(async () => {
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
      return null;
    }

    const payload = (await response.json()) as OpenCodeChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    return typeof content === "string" ? parseOpenCodeInstruction(content) : null;
  }).pipe(Effect.catch(() => Effect.succeed(null)));
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
        const instruction = yield* callOpenCodeModel(options, messages);
        if (!instruction) {
          return {
            changes,
            summary: "worker did not return a usable instruction",
            stop: true,
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
