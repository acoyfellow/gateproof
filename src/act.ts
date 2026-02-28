import type { Log } from "./types";

/**
 * Agent configuration for Filepath container execution.
 *
 * Specifies which agent runtime, model, and task to run inside
 * an isolated container. The container communicates via NDJSON
 * on stdout/stdin using the Filepath Agent Protocol (FAP).
 */
export interface AgentActConfig {
  /** Display name for the agent (used in logs and tree UI) */
  name: string;
  /** Agent runtime: "claude-code" | "codex" | "cursor" | or a custom Docker image */
  agent: string;
  /** Model to use (e.g. "claude-sonnet-4-20250514", "gpt-4o") */
  model: string;
  /** Task description — sent as FILEPATH_TASK env var */
  task: string;
  /** Git repository URL to clone into /workspace */
  repo?: string;
  /** Additional environment variables for the container */
  env?: Record<string, string>;
  /** Timeout for the entire agent run in ms (default: 300_000 = 5 min) */
  timeoutMs?: number;
}

export type Action =
  | { _tag: "Deploy"; worker: string }
  | { _tag: "Browser"; url: string; headless?: boolean; waitMs?: number }
  | { _tag: "Wait"; ms: number }
  | { _tag: "Exec"; command: string; cwd?: string; timeoutMs?: number }
  | { _tag: "Agent"; config: AgentActConfig };

export namespace Act {
  export function deploy(config: { worker: string }): Action {
    return { _tag: "Deploy", worker: config.worker };
  }

  export function browser(config: {
    url: string;
    headless?: boolean;
    waitMs?: number;
  }): Action {
    return {
      _tag: "Browser",
      url: config.url,
      headless: config.headless ?? true,
      waitMs: config.waitMs ?? 5000
    };
  }

  export function wait(ms: number): Action {
    return { _tag: "Wait", ms };
  }

  export function exec(command: string, opts?: { cwd?: string; timeoutMs?: number }): Action {
    return { _tag: "Exec", command, cwd: opts?.cwd, timeoutMs: opts?.timeoutMs };
  }

  /**
   * Run an AI agent in a Filepath container.
   *
   * The agent executes in an isolated container with a git repo at /workspace.
   * It communicates via the Filepath Agent Protocol (FAP) — NDJSON events on
   * stdout that get mapped to Gateproof Log entries for gate assertions.
   *
   * @example
   * ```ts
   * Act.agent({
   *   name: "fix-auth",
   *   agent: "claude-code",
   *   model: "claude-sonnet-4-20250514",
   *   task: "Fix the authentication bug in src/auth.ts",
   *   repo: "https://github.com/org/repo",
   * })
   * ```
   */
  export function agent(config: AgentActConfig): Action {
    return { _tag: "Agent", config };
  }
}
