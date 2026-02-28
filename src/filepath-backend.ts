/**
 * Filepath Backend — ObserveResource implementation for Filepath containers
 *
 * Creates an observe resource that reads NDJSON events from a Filepath
 * agent container's stdout and maps them to Gateproof Log entries.
 *
 * This is the bridge: Filepath's agent protocol becomes observable
 * evidence for gate assertions.
 */

import { Effect, Queue, Runtime } from "effect";
import type { Log } from "./types";
import type { AgentActConfig } from "./act";
import { createObserveResource, type Backend, type ObserveResource } from "./observe";
import { agentEventToLog, parseAgentEvent, serializeInput, type AgentEvent } from "./filepath-protocol";

/**
 * Interface for a Filepath container connection.
 * Implemented by real container runtimes or test mocks.
 */
export interface FilepathContainer {
  /** NDJSON line stream from the container's stdout */
  stdout: AsyncIterable<string>;
  /** Send an NDJSON message to the container's stdin */
  sendInput(line: string): Promise<void>;
  /** Stop the container */
  stop(): Promise<void>;
}

/**
 * Interface for spawning Filepath containers.
 * Swap implementations for real containers vs test mocks.
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

/**
 * Creates a mock Filepath container for testing.
 *
 * Feed it NDJSON events and it emits them as if they came from a real container.
 * Use `container.emit(event)` to push events, `container.done()` to signal completion.
 */
export function createMockFilepathContainer(): FilepathContainer & {
  emit(event: AgentEvent): void;
  emitRaw(line: string): void;
  done(): void;
} {
  const lines: string[] = [];
  let resolve: (() => void) | null = null;
  let isDone = false;

  const waitForLine = () =>
    new Promise<void>((r) => {
      resolve = r;
    });

  return {
    emit(event: AgentEvent) {
      lines.push(JSON.stringify(event));
      if (resolve) {
        const r = resolve;
        resolve = null;
        r();
      }
    },
    emitRaw(line: string) {
      lines.push(line);
      if (resolve) {
        const r = resolve;
        resolve = null;
        r();
      }
    },
    done() {
      isDone = true;
      if (resolve) {
        const r = resolve;
        resolve = null;
        r();
      }
    },
    stdout: {
      async *[Symbol.asyncIterator]() {
        while (true) {
          if (lines.length > 0) {
            yield lines.shift()!;
          } else if (isDone) {
            return;
          } else {
            await waitForLine();
          }
        }
      },
    },
    async sendInput(line: string) {
      // Mock: just collect input, no real stdin
    },
    async stop() {
      isDone = true;
      if (resolve) {
        const r = resolve;
        resolve = null;
        r();
      }
    },
  };
}
