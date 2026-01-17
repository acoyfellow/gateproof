import { Effect, Queue, Runtime, Stream } from "effect";
import type { Log, LogFilter, LogStream } from "./types";
import { Schema } from "@effect/schema";

export class ObservabilityError extends Schema.TaggedError<ObservabilityError>()(
  "ObservabilityError",
  { 
    cause: Schema.Unknown,
    message: Schema.optional(Schema.String),
    stack: Schema.optional(Schema.String)
  }
) {}

export function createObservabilityError(cause: unknown): ObservabilityError {
  const error = cause instanceof Error ? cause : new Error(String(cause));
  return new ObservabilityError({
    cause,
    message: error.message,
    stack: error.stack
  });
}

export interface ObserveResource {
  start(): Effect.Effect<LogStream, ObservabilityError>;
  stop(): Effect.Effect<void, ObservabilityError>;
  query(filter: LogFilter): Effect.Effect<Log[], ObservabilityError>;
}

export interface Backend {
  start(): Effect.Effect<LogStream, ObservabilityError>;
  stop(): Effect.Effect<void, ObservabilityError>;
}

export function createObserveResource(backend: Backend): ObserveResource {
  return {
    start() {
      return backend.start();
    },
    stop() {
      return backend.stop();
    },
    query(filter: LogFilter) {
      return Effect.acquireUseRelease(
        backend.start(),
        (stream) =>
          Stream.fromAsyncIterable(stream, () => Effect.void).pipe(
            Stream.filter((log) => matchesFilter(log, filter)),
            Stream.runCollect,
            Effect.map((chunk) => Array.from(chunk)),
            Effect.catchAll((e) => Effect.fail(createObservabilityError(e)))
          ),
        () => backend.stop().pipe(Effect.catchAll(() => Effect.void))
      );
    }
  };
}

function matchesFilter(log: Log, filter: LogFilter): boolean {
  if (filter.requestId && log.requestId !== filter.requestId) return false;
  if (filter.stage && log.stage !== filter.stage) return false;
  if (filter.action && log.action !== filter.action) return false;
  if (filter.status && log.status !== filter.status) return false;
  if (filter.since && log.timestamp) {
    const logTime = new Date(log.timestamp).getTime();
    if (logTime < filter.since.getTime()) return false;
  }
  if (filter.until && log.timestamp) {
    const logTime = new Date(log.timestamp).getTime();
    if (logTime > filter.until.getTime()) return false;
  }
  return true;
}

export function createLogStreamFromQueue(
  queue: Queue.Queue<Log>
): LogStream {
  const runtime = Runtime.defaultRuntime;
  return {
    async *[Symbol.asyncIterator]() {
      try {
        while (true) {
          const log = await Runtime.runPromise(runtime)(
            Queue.take(queue).pipe(
              Effect.timeout("100 millis"),
              Effect.catchAll(() => Effect.succeed(null as Log | null))
            )
          );
          if (log === null) break;
          yield log;
        }
      } finally {
        const remaining: Log[] = [];
        try {
          for (let i = 0; i < 100; i++) {
            const log = await Runtime.runPromise(runtime)(
              Queue.take(queue).pipe(
                Effect.timeout("10 millis"),
                Effect.catchAll(() => Effect.succeed(null as Log | null))
              )
            );
            if (log === null) break;
            remaining.push(log);
          }
        } catch {
          // Ignore
        }
        for (const log of remaining) {
          yield log;
        }
      }
    }
  } as AsyncIterable<Log>;
}
