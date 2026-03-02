import { spawn } from "node:child_process";
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

export interface PlanGoal {
  id: string;
  title: string;
  gate: GateDefinition;
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

export interface LoopAgentContext {
  iteration: number;
  plan: PlanDefinition;
  result: PlanRunResult;
  failedGoals: ReadonlyArray<GateRunResult>;
}

export type LoopAgent =
  | ((context: LoopAgentContext) => Promise<unknown> | unknown)
  | null
  | undefined;

export interface PlanRunLoopOptions {
  maxIterations?: number;
  agent?: LoopAgent;
}

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
        resolve();
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

const runPlanOnce = (plan: PlanDefinition): Effect.Effect<PlanRunResult, never, never> =>
  Effect.gen(function* () {
    const cloudflareTails = new Map<string, CloudflareTailState>();
    const goals: GateRunResult[] = [];
    for (const goal of plan.goals) {
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

const runAgent = (
  agent: LoopAgent,
  context: LoopAgentContext,
): Effect.Effect<void, never, never> => {
  if (!agent) {
    return Effect.void;
  }

  return Effect.tryPromise(async () => {
    await Promise.resolve(agent(context));
  }).pipe(Effect.catch(() => Effect.void));
};

const runPlanLoop = (
  plan: PlanDefinition,
  options: PlanRunLoopOptions = {},
): Effect.Effect<PlanRunResult, never, never> =>
  Effect.gen(function* () {
    const maxIterations = options.maxIterations ?? plan.loop?.maxIterations ?? 1;
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
      const result = yield* runPlanOnce(plan);
      latest = {
        ...result,
        iterations: iteration,
      };

      if (latest.status === "pass" || latest.status === "skip") {
        return yield* withCleanup(plan, latest);
      }

      if (plan.loop?.stopOnFailure && latest.status === "fail") {
        return yield* withCleanup(plan, latest);
      }

      if (iteration < maxIterations) {
        const failedGoals = latest.goals.filter((goal) => goal.status !== "pass");
        yield* runAgent(options.agent, {
          iteration,
          plan,
          result: latest,
          failedGoals,
        });
      }
    }

    return yield* withCleanup(plan, latest);
  });

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
