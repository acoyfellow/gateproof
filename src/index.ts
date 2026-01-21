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
import { runPreflight, PreflightError, type PreflightSpec } from "./preflight";

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

export type GateErrorType = GateError | LogTimeoutError | AssertionFailed | AssertionAggregateFailed | ObservabilityError | PreflightError;

export interface GateSpec {
  name?: string;
  preflight?: PreflightSpec;
  observe: ObserveResource;
  act: Action[];
  assert: Assertion[];
  stop?: { idleMs: number; maxMs: number };
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
    requestIds: [...requestIds],
    stagesSeen: [...stages],
    actionsSeen: [...actions],
    errorTags: [...errorTags]
  };
}

function runAction(action: Action): Effect.Effect<void, GateError> {
  const executor = getActionExecutor(action);
  return executor.execute(action);
}

function collectLogs(
  stream: AsyncIterable<Log>,
  stop: { idleMs: number; maxMs: number }
): Effect.Effect<Log[], LogTimeoutError> {
  const startTime = Date.now();
  const lastLogTimeRef = Ref.unsafeMake(Date.now());

  return Effect.gen(function* () {
    const logStream = Stream.fromAsyncIterable(stream, () => Effect.void);

    const collected = yield* logStream.pipe(
      Stream.tap(() => Ref.set(lastLogTimeRef, Date.now())),
      Stream.take(50000),
      Stream.buffer({ capacity: 1000 }),
      Stream.timeout(`${stop.maxMs} millis`),
      Stream.runCollect,
      Effect.catchAll((error) => {
        if (error && typeof error === "object" && "_tag" in error && error._tag === "TimeoutException") {
          return Effect.fail(new LogTimeoutError({ maxMs: stop.maxMs, idleMs: stop.idleMs }));
        }
        return Effect.gen(function* () {
          const now = Date.now();
          const lastLogTime = yield* Ref.get(lastLogTimeRef);
          const totalTime = now - startTime;
          if (totalTime > stop.maxMs) {
            return yield* Effect.fail(new LogTimeoutError({ maxMs: stop.maxMs, idleMs: stop.idleMs }));
          }
          return [];
        });
      })
    );

    const now = Date.now();
    const lastLogTime = yield* Ref.get(lastLogTimeRef);
    const idleTime = now - lastLogTime;
    const totalTime = now - startTime;

    if (totalTime > stop.maxMs) {
      return yield* Effect.fail(new LogTimeoutError({ maxMs: stop.maxMs, idleMs: stop.idleMs }));
    }

    if (idleTime > stop.idleMs && collected.length > 0) {
      return Array.from(collected);
    }

    if (collected.length > 0) {
      return Array.from(collected);
    }

    yield* Effect.sleep(`${stop.idleMs} millis`);
    yield* logStream.pipe(
      Stream.take(1),
      Stream.timeout("10 millis"),
      Stream.runCollect,
      Effect.catchAll(() => Effect.succeed([]))
    );

    return Array.from(collected);
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
          const stop = spec.stop ?? { idleMs: 3000, maxMs: 15000 };

          // Run preflight check if specified
          if (spec.preflight) {
            const preflightResult = yield* runPreflight(spec.preflight).pipe(
              Effect.tap(() => Effect.log("Preflight check started")),
              Effect.either
            );

            if (Either.isLeft(preflightResult)) {
              return handleGateError(preflightResult.left, startedAt, []);
            }

            const result = preflightResult.right;
            
            if (result.decision === "DENY") {
              const error = new PreflightError({
                cause: `Preflight denied: ${result.justification}`
              });
              return handleGateError(error, startedAt, []);
            }

            if (result.decision === "ASK") {
              yield* Effect.log(`Preflight requires clarification: ${result.justification}`);
              if (result.questions && result.questions.length > 0) {
                yield* Effect.log(`Questions: ${result.questions.join(", ")}`);
              }
              // For now, we'll continue execution even with ASK
              // In a real implementation, this might pause for human input
            }

            yield* Effect.log(`Preflight check passed: ${result.decision} - ${result.justification}`);
          }

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

          const logsResult = yield* collectLogs(stream, stop).pipe(
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

          if (Either.isRight(logsResult) && typeof logsResult.right === "object" && logsResult.right !== null && "status" in logsResult.right && logsResult.right.status === "timeout") {
            return logsResult.right as GateResult;
          }

          if (Either.isLeft(logsResult)) {
            return handleGateError(logsResult.left, startedAt, []);
          }

          const logs = logsResult.right as Log[];

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
        }),
      () => spec.observe.stop().pipe(Effect.catchAll(() => Effect.void))
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
    if (result.status !== "success") {
      const errorTag = result.error && "_tag" in result.error ? (result.error as any)._tag : "unknown";
      console.log(`error=${errorTag}`);
    }
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

export { Act } from "./act";
export { Assert } from "./assert";
export { Preflight, runPreflight } from "./preflight";
export type { PreflightSpec, PreflightResult, PreflightDecision, PreflightAction } from "./preflight";
export { PreflightError } from "./preflight";
export type { Log, GateResult, LogFilter } from "./types";
export type { ObserveResource } from "./observe";
export type { Provider } from "./provider";
export { createEmptyBackend, createEmptyObserveResource, runGateWithErrorHandling } from "./utils";
export { createTestObserveResource } from "./test-helpers";
export { createHttpObserveResource } from "./http-backend";