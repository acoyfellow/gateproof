import { Effect, Queue } from "effect";
import type { Log } from "./types";
import { createLogStreamFromQueue, type ObserveResource } from "./observe";

/**
 * Global registry for active CLI observe resources.
 * When an ExecExecutor runs a command, it notifies all registered observers
 * with stdout/stderr lines as Log entries. This is a no-op when no CLI
 * observers are active.
 */
const activeCliObservers = new Set<(log: Log) => void>();

export function registerCliObserver(callback: (log: Log) => void): void {
  activeCliObservers.add(callback);
}

export function unregisterCliObserver(callback: (log: Log) => void): void {
  activeCliObservers.delete(callback);
}

export function hasActiveCliObservers(): boolean {
  return activeCliObservers.size > 0;
}

export function notifyCliObservers(log: Log): void {
  for (const cb of activeCliObservers) {
    cb(log);
  }
}

/**
 * Creates an observe resource that captures stdout/stderr from Act.exec calls
 * within the same gate run.
 *
 * When this observe resource is active (between start and stop), any Act.exec
 * call will have its process output captured as Log entries. Each line of
 * stdout/stderr becomes a separate log with:
 * - stage: "cli"
 * - action: "stdout" | "stderr" | "exec"
 * - message: the line content (or exit summary)
 * - status: "info" for output lines, "success"/"error" for process exit
 *
 * @example
 * ```ts
 * import { Gate, Act, Assert, createCliObserveResource } from "gateproof";
 *
 * const result = await Gate.run({
 *   observe: createCliObserveResource(),
 *   act: [Act.exec("cargo build --release")],
 *   assert: [
 *     Assert.noErrors(),
 *     Assert.custom("compiled", (logs) =>
 *       logs.some((l) => l.message?.includes("Finished"))
 *     ),
 *   ],
 * });
 * ```
 */
export function createCliObserveResource(): ObserveResource {
  let queue: Queue.Queue<Log> | null = null;
  let callback: ((log: Log) => void) | null = null;

  return {
    start() {
      return Effect.gen(function* () {
        queue = yield* Queue.unbounded<Log>();
        callback = (log: Log) => {
          if (!queue) return;
          Effect.runPromise(
            Queue.offer(queue, log).pipe(Effect.catchAll(() => Effect.void))
          ).catch(() => {});
        };
        registerCliObserver(callback);
        return createLogStreamFromQueue(queue);
      });
    },
    stop() {
      return Effect.gen(function* () {
        if (callback) {
          unregisterCliObserver(callback);
          callback = null;
        }
        queue = null;
      });
    },
    query() {
      return Effect.succeed([]);
    },
  };
}
