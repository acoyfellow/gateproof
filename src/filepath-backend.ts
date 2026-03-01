/**
 * Filepath Backend — ObserveResource implementation for Filepath containers
 *
 * Creates an observe resource that reads NDJSON events from a Filepath
 * agent container's stdout and maps them to Gateproof Log entries.
 *
 * This is the bridge: Filepath's agent protocol becomes observable
 * evidence for gate assertions.
 */

import { Effect } from "effect";
import type { Log } from "./types";
import type { AgentActConfig } from "./act";
import { createObserveResource, type Backend, type ObserveResource } from "./observe";
import { agentEventToLog, parseAgentEvent } from "./filepath-protocol";

/**
 * Interface for a Filepath container connection.
 * Implemented by real container runtimes.
 */
export interface FilepathContainer {
  /**
   * NDJSON line stream from the container's stdout.
   *
   * This stream must support concurrent readers. Gateproof's observe layer may
   * read it to collect proof while the action executor also watches it for
   * lifecycle completion.
   */
  stdout: AsyncIterable<string>;
  /** Send an NDJSON message to the container's stdin */
  sendInput(line: string): Promise<void>;
  /** Stop the container */
  stop(): Promise<void>;
}

/**
 * Interface for spawning Filepath containers.
 * Real runtimes implement this to launch containers.
 */
export interface FilepathRuntime {
  spawn(config: AgentActConfig): Promise<FilepathContainer>;
}

/**
 * Creates a Backend that reads NDJSON events from a Filepath container
 * and emits them as Gateproof Log entries.
 */
export function createFilepathBackend(
  container: FilepathContainer,
  agentName?: string
): Backend {
  return {
    start() {
      return Effect.succeed<AsyncIterable<Log>>({
        async *[Symbol.asyncIterator]() {
          for await (const line of container.stdout) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const event = parseAgentEvent(trimmed);
            if (!event) continue;

            yield agentEventToLog(event, agentName);
          }
        },
      });
    },
    stop() {
      return Effect.tryPromise({
        try: () => container.stop(),
        catch: () => undefined,
      }).pipe(Effect.catchAll(() => Effect.void));
    },
  };
}

/**
 * Creates an ObserveResource backed by a Filepath container.
 *
 * Usage:
 * ```ts
 * const container = await runtime.spawn(config);
 * const observe = createFilepathObserveResource(container, "my-agent");
 *
 * const result = await Gate.run({
 *   observe,
 *   act: [Act.wait(1000)],
 *   assert: [Assert.hasAction("commit")],
 * });
 * ```
 */
export function createFilepathObserveResource(
  container: FilepathContainer,
  agentName?: string
): ObserveResource {
  return createObserveResource(createFilepathBackend(container, agentName));
}
