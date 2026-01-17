import { Effect, Queue, Schedule, Fiber, Ref } from "effect";
import type { Log, LogStream } from "../types";
import { ObservabilityError, createLogStreamFromQueue, createObservabilityError } from "../observe";

export interface PollingBackendConfig {
  pollInterval?: number;
}

export interface PollingBackend<T> {
  fetchData(lastTimestamp: number): Effect.Effect<T[], ObservabilityError, never>;
  processData(data: T[], lastTimestamp: number): { logs: Log[]; newTimestamp: number };
}

export function createPollingBackend<T>(
  config: PollingBackendConfig,
  backend: PollingBackend<T>
): {
  start(): Effect.Effect<LogStream, ObservabilityError>;
  stop(): Effect.Effect<void, ObservabilityError>;
} {
  const stoppedRef = Ref.unsafeMake(false);
  let fiberRef: Fiber.RuntimeFiber<void, ObservabilityError> | null = null;

  return {
    start() {
      return Effect.gen(function* () {
        const queue = yield* Queue.bounded<Log>(10000);
        let lastTimestamp = Date.now() - 60000;

        const pollOnce = Effect.gen(function* () {
          const isStopped = yield* Ref.get(stoppedRef);
          if (isStopped) return;

          const data = yield* backend.fetchData(lastTimestamp).pipe(
            Effect.catchAll((error) =>
              Effect.gen(function* () {
                yield* Effect.logError("Failed to fetch data", error);
                return [] as T[];
              })
            )
          );

          const { logs, newTimestamp } = backend.processData(data, lastTimestamp);
          lastTimestamp = newTimestamp;

          for (const log of logs) {
            const isStopped = yield* Ref.get(stoppedRef);
            if (isStopped) break;

            yield* Queue.offer(queue, log).pipe(
              Effect.catchAll(() => Effect.void)
            );
          }
        });

        const pollLoop = Effect.gen(function* () {
          while (true) {
            const isStopped = yield* Ref.get(stoppedRef);
            if (isStopped) break;
            yield* pollOnce;
            yield* Effect.sleep(`${config.pollInterval ?? 1000} millis`);
          }
        });

        const fiber = yield* Effect.forkDaemon(
          pollLoop.pipe(
            Effect.tapError((error) =>
              Effect.logError("Polling failed", error)
            )
          )
        );
        fiberRef = fiber;

        return createLogStreamFromQueue(queue);
      });
    },
    stop() {
      return Effect.gen(function* () {
        yield* Ref.set(stoppedRef, true);
        if (fiberRef) {
          yield* Fiber.interrupt(fiberRef);
          fiberRef = null;
        }
      });
    }
  };
}
