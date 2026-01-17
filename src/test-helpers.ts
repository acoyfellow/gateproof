/**
 * Test utilities for gateproof
 * Shared helpers used across test files
 */

import { Effect, Queue, Runtime } from "effect";
import type { Log } from "./types";
import { createObserveResource, type Backend } from "./observe";

/**
 * Creates a test observe resource from a queue
 * Used in test files to simulate log streams
 */
export function createTestObserveResource(queue: Queue.Queue<Log>) {
  const backend: Backend = {
    start: () => Effect.succeed<AsyncIterable<Log>>({
      async *[Symbol.asyncIterator]() {
        const runtime = Runtime.defaultRuntime;
        while (true) {
          try {
            const log = await Runtime.runPromise(runtime)(
              Queue.take(queue).pipe(
                Effect.timeout("100 millis"),
                Effect.catchAll(() => Effect.succeed(null as Log | null))
              )
            );
            if (log === null) break;
            yield log;
          } catch {
            break;
          }
        }
      }
    }),
    stop: () => Effect.void
  };
  return createObserveResource(backend);
}
