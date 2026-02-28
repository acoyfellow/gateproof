import { Effect, Queue, Ref, Either, Schedule, Stream, Scope } from "effect";
import type { GateResult, Log } from "./types";
import type { ObserveResource } from "./observe";
import type { Action } from "./act";
import type { Assertion } from "./assert";
import { Assert, AssertionFailed, AssertionAggregateFailed } from "./assert";
import { ObservabilityError } from "./observe";
import { Schema } from "@effect/schema";
import { Act } from "./act";
import { getActionExecutor } from "./action-executors";
import {
  DEFAULT_IDLE_MS,
  DEFAULT_MAX_MS,
  MAX_LOG_BUFFER,
  LOG_BUFFER_CAPACITY
} from "./constants";
import type { GateResultV1, SerializableError } from "./report";
import { serializeError, sortDeterministic, toGateResultV1 } from "./report";

export class GateError extends Schema.TaggedError<GateError>()("GateError", {
  cause: Schema.Unknown
}) {}

export class LogTimeoutError extends Schema.TaggedError<LogTimeoutError>()(
  "LogTimeoutError",
  {
    maxMs: Schema.Number,
    idleMs: Schema.Number,
    cause: Schema.optional(Schema.Unknown)
  }
) {}

export type GateErrorType = GateError | LogTimeoutError | AssertionFailed | AssertionAggregateFailed | ObservabilityError;

export interface GateSpec {
  name?: string;
  observe: ObserveResource;
  act: Action[];
  assert: Assertion[];
  /**
   * Timeout configuration for log collection.
   * 
   * - **idleMs**: If no logs arrive for this duration AND logs have been collected, return early.
   *   Default: 3000ms
   * - **maxMs**: Maximum total time to wait for logs. If exceeded, gate fails with timeout.
   *   Default: 15000ms
   * 
   * Examples:
   * - `{ idleMs: 1000, maxMs: 5000 }`: Wait up to 5s total, but return early if idle > 1s with logs
   * - `{ idleMs: 0, maxMs: 10000 }`: Wait full 10s, never return early on idle
   */
  stop?: { idleMs: number; maxMs: number };
  /**
   * Maximum number of logs to collect before stopping.
   * Defaults to 50_000.
   */
  maxLogs?: number;
  report?: "json" | "pretty";
}

function summarize(logs: Log[]): GateResult["evidence"] {
  const requestIds = new Set<string>();
  const stages = new Set<string>();
  const actions = new Set<string>();
  const errorTags = new Set<string>();

  for (const log of logs) {
    if (log.requestId) requestIds.add(log.requestId);
    if (log.stage) stages.add(log.stage);
    if (log.action) actions.add(log.action);
    if (log.error?.tag) errorTags.add(log.error.tag);
  }

  return {
    requestIds: sortDeterministic([...requestIds]),
    stagesSeen: sortDeterministic([...stages]),
    actionsSeen: sortDeterministic([...actions]),
    errorTags: sortDeterministic([...errorTags])
  };
}

function makeLogTimeoutError(
  stop: { idleMs: number; maxMs: number },
  cause?: unknown
): LogTimeoutError {
  return new LogTimeoutError({
    maxMs: stop.maxMs,
    idleMs: stop.idleMs,
    cause
  });
}

function runAction(action: Action): Effect.Effect<void, GateError> {
  const executor = getActionExecutor(action);
  return executor.execute(action);
}

/**
 * Collects logs from a stream with timeout and idle detection.
 * 
 * Behavior:
 * - **maxMs**: Maximum total time to wait for logs. If exceeded, returns LogTimeoutError.
 * - **idleMs**: If no logs arrive for this duration, return early (with collected logs if any, or empty array if none).
 * 
 * Examples:
 * - Stream produces logs continuously: collects until maxLogs or maxMs exceeded
 * - Stream stops producing logs: if idleMs elapsed and we have logs, return them
 * - Stream never produces logs: waits for idleMs then returns empty array if maxMs not exceeded, otherwise timeout error
 * - Stream error: preserved in LogTimeoutError.cause
 */
function collectLogs(
  stream: AsyncIterable<Log>,
  stop: { idleMs: number; maxMs: number },
  maxLogs: number
): Effect.Effect<Log[], LogTimeoutError> {
  const startTime = Date.now();
  const lastLogTimeRef = Ref.unsafeMake(Date.now());

  return Effect.gen(function* () {
    const logStream = Stream.fromAsyncIterable(stream, () => Effect.void);

    const collected = yield* logStream.pipe(
      Stream.tap(() => Ref.set(lastLogTimeRef, Date.now())),
      Stream.take(maxLogs),
      Stream.buffer({ capacity: LOG_BUFFER_CAPACITY }),
      Stream.timeout(`${stop.maxMs} millis`),
      Stream.runCollect,
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          // Stream-level timeout
          if (error && typeof error === "object" && "_tag" in error && error._tag === "TimeoutException") {
            return yield* Effect.fail(makeLogTimeoutError(stop, error));
          }
          const now = Date.now();
          const totalTime = now - startTime;
          if (totalTime > stop.maxMs) {
            return yield* Effect.fail(makeLogTimeoutError(stop, error));
          }
          // Non-timeout stream error before maxMs elapsed – surface as timeout with cause
          return yield* Effect.fail(makeLogTimeoutError(stop, error));
        })
      )
    );

    const now = Date.now();
    const lastLogTime = yield* Ref.get(lastLogTimeRef);
    const idleTime = now - lastLogTime;
    const totalTime = now - startTime;

    if (totalTime > stop.maxMs) {
      return yield* Effect.fail(makeLogTimeoutError(stop));
    }

    // If we have logs and have been idle longer than idleMs, return what we have.
    if (idleTime > stop.idleMs && collected.length > 0) {
      return Array.from(collected);
    }

    // If we have any logs at all, return them.
    if (collected.length > 0) {
      return Array.from(collected);
    }

    // No logs collected yet. Wait for idleMs before giving up, unless maxMs would be exceeded.
    if (idleTime < stop.idleMs) {
      const remainingIdle = stop.idleMs - idleTime;
      const remainingMax = stop.maxMs - totalTime;
      const waitTime = Math.min(remainingIdle, remainingMax);
      
      if (waitTime > 0) {
        yield* Effect.sleep(`${waitTime} millis`);
        
        // After waiting, check if maxMs is now exceeded
        const afterWaitTime = Date.now() - startTime;
        if (afterWaitTime > stop.maxMs) {
          return yield* Effect.fail(makeLogTimeoutError(stop));
        }
      }
    }

    // No logs collected after waiting – return empty array.
    return [];
  });
}

function handleGateError(
  error: GateErrorType,
  startedAt: number,
  logs: Log[]
): GateResult {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  return {
    status: "failed",
    durationMs: Date.now() - startedAt,
    logs,
    evidence: summarize(logs),
    error: errorObj
  };
}

export namespace Gate {
  export function run(spec: GateSpec): Promise<GateResult> {
    return Effect.runPromise(Effect.scoped(runEffect(spec)));
  }

  export function runEffect(
    spec: GateSpec
  ): Effect.Effect<GateResult, GateErrorType, Scope.Scope> {
    return Effect.acquireUseRelease(
      spec.observe.start().pipe(
        Effect.catchAll((error) =>
          Effect.fail(new GateError({ cause: error }))
        )
      ),
      (stream) =>
        Effect.gen(function* () {
          const startedAt = Date.now();
          const stop = spec.stop ?? { idleMs: DEFAULT_IDLE_MS, maxMs: DEFAULT_MAX_MS };
          const maxLogs = spec.maxLogs ?? MAX_LOG_BUFFER;

          yield* Effect.sleep("200 millis");

          let actionError: GateError | null = null;
      for (const action of spec.act) {
        const result = yield* runAction(action).pipe(
          Effect.tap(() => Effect.log(`Action ${action._tag} completed`)),
          Effect.tapError((error) => Effect.logError(`Action ${action._tag} failed`, error)),
          Effect.either
        );
        if (Either.isLeft(result)) {
          actionError = result.left;
          break;
        }
      }
          const actionResult = actionError ? Either.left(actionError) : Either.right(undefined);

          if (Either.isLeft(actionResult)) {
            return handleGateError(actionResult.left, startedAt, []);
          }

          const logsResult = yield* collectLogs(stream, stop, maxLogs).pipe(
            Effect.timeoutFail({
              duration: `${stop.maxMs} millis`,
              onTimeout: () => new LogTimeoutError({ maxMs: stop.maxMs, idleMs: stop.idleMs })
            }),
            Effect.catchTag("LogTimeoutError", (error) =>
              Effect.succeed({
                status: "timeout" as const,
                durationMs: Date.now() - startedAt,
                logs: [],
                evidence: summarize([]),
                error: error instanceof Error ? error : new Error(String(error))
              } as GateResult)
            ),
            Effect.either
          );

          if (Either.isRight(logsResult)) {
            const right = logsResult.right;
            // Right side can be either collected logs or a pre-built timeout GateResult
            if (Array.isArray(right)) {
              const logs = right;

              const assertResult = yield* Assert.run(spec.assert, logs).pipe(
                Effect.either
              );

              const evidence = summarize(logs);
              const durationMs = Date.now() - startedAt;

              if (Either.isLeft(assertResult)) {
                const result = handleGateError(assertResult.left, startedAt, logs);
                printResult(spec.report, result);
                return result;
              }

              const result: GateResult = {
                status: "success",
                durationMs,
                logs,
                evidence
              };
              printResult(spec.report, result);
              return result;
            }

            // Timeout case already mapped into a GateResult above
            return right as GateResult;
          }

          // Left side is a LogTimeoutError or other gate error
          return handleGateError(logsResult.left, startedAt, []);

        }),
      () =>
        spec.observe
          .stop()
          .pipe(
            Effect.tapError((error) =>
              Effect.logError("Failed to stop observe resource", error)
            ),
            Effect.catchAll(() => Effect.void)
          )
    );
  }
}

function printResult(report: GateSpec["report"], result: GateResult): void {
  if (report === "pretty") {
    console.log(`\n[${result.status.toUpperCase()}] ${result.durationMs}ms`);
    console.log(
      `actions=${result.evidence.actionsSeen.length} stages=${result.evidence.stagesSeen.join(",") || "none"}`
    );
    if (result.evidence.errorTags.length) {
      console.log(`errorTags=${result.evidence.errorTags.join(",")}`);
    }
    if (result.status !== "success" && result.error) {
      const errorWithTag = result.error as Error & { _tag?: string };
      const errorTag = errorWithTag._tag ?? "unknown";
      console.log(`error=${errorTag}`);
    }
  } else {
    // Use serializable version for JSON output
    const serializable = toGateResultV1(result);
    console.log(JSON.stringify(serializable, null, 2));
  }
}

export { Act } from "./act";
export { Assert } from "./assert";
export type { Log, GateResult, LogFilter } from "./types";
export type { ObserveResource } from "./observe";
export type { Provider } from "./provider";
export { createEmptyBackend, createEmptyObserveResource, runGateWithErrorHandling } from "./utils";
export { createTestObserveResource } from "./test-helpers";
export { createHttpObserveResource } from "./http-backend";
export { createCliObserveResource } from "./cli-observe";
export type { GateResultV1, PrdReportV1, StoryResultV1, SerializableError, LLMFailureSummary } from "./report";
export { serializeError, toGateResultV1, createLLMFailureSummary, formatLLMFailureSummary } from "./report";