/**
 * Cloudflare Sandbox Runtime — real FilepathRuntime for Cloudflare Workers
 *
 * Spawns agent processes inside Cloudflare Sandbox containers,
 * wires NDJSON stdout to a broadcast AsyncIterable (solving the
 * dual-reader problem), and maps stdin/stop to the sandbox process.
 *
 * Usage:
 * ```ts
 * import { getSandbox } from "@cloudflare/sandbox";
 * import { CloudflareSandboxRuntime, setFilepathRuntime } from "gateproof";
 *
 * setFilepathRuntime(new CloudflareSandboxRuntime({
 *   getSandbox: (config) => getSandbox(env.Sandbox, `agent-${config.name}-${Date.now()}`),
 * }));
 * ```
 */

import type { FilepathContainer, FilepathRuntime } from "./filepath-backend";
import type { AgentActConfig } from "./act";

/**
 * Minimal interface for a Cloudflare Sandbox instance.
 * Matches the shape returned by `getSandbox()` from `@cloudflare/sandbox`.
 */
export interface SandboxInstance {
  startProcess(
    command: string[],
    options?: { env?: Record<string, string>; cwd?: string }
  ): Promise<SandboxProcess>;
}

/**
 * Minimal interface for a sandbox process.
 * Matches the shape returned by `sandbox.startProcess()`.
 */
export interface SandboxProcess {
  stdout: ReadableStream<Uint8Array>;
  stdin?: WritableStream<Uint8Array>;
}

export interface CloudflareSandboxRuntimeOptions {
  /**
   * Factory that creates a sandbox for each agent spawn.
   * Called once per `spawn()` invocation.
   *
   * @example
   * ```ts
   * import { getSandbox } from "@cloudflare/sandbox";
   * getSandbox: (config) => getSandbox(env.Sandbox, `agent-${config.name}-${Date.now()}`)
   * ```
   */
  getSandbox: (config: AgentActConfig) => SandboxInstance | Promise<SandboxInstance>;

  /**
   * Override the command run inside the container.
   * Receives the agent config and returns an argv array.
   *
   * Default: `[config.agent]` (the agent field is used as the binary name).
   */
  command?: (config: AgentActConfig) => string[];
}

/**
 * A broadcast AsyncIterable that supports multiple concurrent readers.
 *
 * Each call to `[Symbol.asyncIterator]()` returns an independent iterator
 * that starts from the beginning of the buffer and sees all items,
 * including those pushed after the iterator was created.
 *
 * This solves the dual-reader problem: both the executor (lifecycle drain)
 * and observe layer (log mapping) can read from the same `container.stdout`
 * without interfering with each other.
 */
export class BroadcastIterable<T> implements AsyncIterable<T> {
  private buffer: T[] = [];
  private waiters: Set<() => void> = new Set();
  private isDone = false;

  push(item: T): void {
    this.buffer.push(item);
    for (const waiter of this.waiters) waiter();
    this.waiters.clear();
  }

  end(): void {
    this.isDone = true;
    for (const waiter of this.waiters) waiter();
    this.waiters.clear();
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    let index = 0;
    const self = this;

    return {
      next(): Promise<IteratorResult<T>> {
        if (index < self.buffer.length) {
          return Promise.resolve({ value: self.buffer[index++], done: false });
        }
        if (self.isDone) {
          return Promise.resolve({ value: undefined as unknown as T, done: true });
        }
        return new Promise<IteratorResult<T>>((resolve) => {
          const check = () => {
            if (index < self.buffer.length) {
              resolve({ value: self.buffer[index++], done: false });
            } else if (self.isDone) {
              resolve({ value: undefined as unknown as T, done: true });
            } else {
              self.waiters.add(check);
            }
          };
          check();
        });
      },
    };
  }
}

/**
 * Reads a `ReadableStream<Uint8Array>` and pushes complete NDJSON lines
 * to a `BroadcastIterable<string>`.
 *
 * Handles:
 * - Partial line buffering (chunks may split across line boundaries)
 * - Stream completion (signals `end()` on the broadcast)
 * - Stream errors (signals `end()` so readers don't hang)
 */
export async function pipeReadableStreamToLines(
  stream: ReadableStream<Uint8Array>,
  broadcast: BroadcastIterable<string>
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Last element is incomplete (or empty if buffer ended with \n)
      buffer = lines.pop()!;

      for (const line of lines) {
        if (line.length > 0) {
          broadcast.push(line);
        }
      }
    }

    // Flush any remaining partial line
    const remaining = buffer + decoder.decode();
    if (remaining.length > 0) {
      broadcast.push(remaining);
    }
  } finally {
    broadcast.end();
    reader.releaseLock();
  }
}

/**
 * Builds the environment variables for the sandbox process.
 */
function buildEnv(config: AgentActConfig): Record<string, string> {
  return {
    FILEPATH_TASK: config.task,
    FILEPATH_AGENT_TYPE: config.agent,
    FILEPATH_MODEL: config.model,
    FILEPATH_WORKSPACE: "/workspace",
    ...config.env,
  };
}

/**
 * Real FilepathRuntime backed by Cloudflare Sandbox.
 *
 * Spawns agent processes inside isolated Cloudflare Sandbox containers.
 * Stdout is parsed as NDJSON lines and exposed as a broadcast
 * `AsyncIterable<string>` so both the executor and observe layer
 * can read concurrently.
 */
export class CloudflareSandboxRuntime implements FilepathRuntime {
  private readonly options: CloudflareSandboxRuntimeOptions;

  constructor(options: CloudflareSandboxRuntimeOptions) {
    this.options = options;
  }

  async spawn(config: AgentActConfig): Promise<FilepathContainer> {
    const sandbox = await this.options.getSandbox(config);
    const command = this.options.command
      ? this.options.command(config)
      : [config.agent];
    const env = buildEnv(config);

    const proc = await sandbox.startProcess(command, {
      env,
      cwd: "/workspace",
    });

    const broadcast = new BroadcastIterable<string>();

    // Start piping stdout → broadcast in the background.
    // Errors are swallowed — the broadcast just ends, and readers
    // see the stream close (which the executor treats as container exit).
    pipeReadableStreamToLines(proc.stdout, broadcast).catch(() => {
      broadcast.end();
    });

    const encoder = new TextEncoder();

    return {
      stdout: broadcast,

      async sendInput(line: string): Promise<void> {
        if (!proc.stdin) {
          throw new Error("Container stdin is not available");
        }
        const writer = proc.stdin.getWriter();
        try {
          await writer.write(encoder.encode(line + "\n"));
        } finally {
          writer.releaseLock();
        }
      },

      async stop(): Promise<void> {
        // Signal the agent to stop via stdin, then close streams.
        // Cloudflare Sandbox doesn't expose SIGTERM — closing stdin
        // is the convention for requesting graceful shutdown.
        if (proc.stdin) {
          try {
            const writer = proc.stdin.getWriter();
            await writer.write(
              encoder.encode(JSON.stringify({ type: "signal", action: "stop" }) + "\n")
            );
            writer.releaseLock();
            await proc.stdin.close();
          } catch {
            // stdin may already be closed
          }
        }
        broadcast.end();
      },
    };
  }
}
