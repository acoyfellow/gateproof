/**
 * Shorthands module - Flatter, more ergonomic helpers for defining gates.
 *
 * This is an optional import that reduces boilerplate for common patterns.
 * The full Gate.run API remains available and unchanged.
 *
 * @example
 * ```ts
 * import { gate, cloudflare, browserAct, noErrors, hasAction } from "gateproof/shorthands";
 *
 * gate("user-signup", {
 *   observe: cloudflare.logs({ dataset: "worker_logs" }),
 *   act: browserAct.goto("https://app.example.com/signup"),
 *   assert: [noErrors(), hasAction("user_created")],
 * });
 * ```
 */

import { Gate, Act, Assert, type GateResult } from "./index";
import type { Log } from "./types";
import type { Assertion } from "./assert";
import type { Action } from "./act";
import type { ObserveResource } from "./observe";
import { createEmptyObserveResource } from "./utils";
import type { GateSpec } from "./index";

// Re-export core assertions as flat functions
export { Assert };

/**
 * Flat assertion: no errors in logs
 */
export function noErrors(): Assertion {
  return Assert.noErrors();
}

/**
 * Flat assertion: logs contain a specific action
 */
export function hasAction(action: string): Assertion {
  return Assert.hasAction(action);
}

/**
 * Flat assertion: logs contain a specific stage
 */
export function hasStage(stage: string): Assertion {
  return Assert.hasStage(stage);
}

/**
 * Flat assertion: custom assertion function
 */
export function custom(name: string, fn: (logs: Log[]) => boolean | Promise<boolean>): Assertion {
  return Assert.custom(name, fn);
}

/**
 * Assertion: logs contain any evidence (at least one action or stage)
 * Useful for positive signal verification.
 */
export function hasAnyEvidence(): Assertion {
  return Assert.custom("HasAnyEvidence", (logs) => {
    return logs.some(l => l.action || l.stage);
  });
}

/**
 * Assertion: logs contain at least N entries
 */
export function hasMinLogs(minCount: number): Assertion {
  return Assert.custom(`HasMinLogs(${minCount})`, (logs) => logs.length >= minCount);
}

/**
 * Assertion: logs contain a log with a specific field value
 */
export function hasLogWith(field: string, value: unknown): Assertion {
  return Assert.custom(`HasLogWith(${field}=${JSON.stringify(value)})`, (logs) => {
    return logs.some(l => (l as Record<string, unknown>)[field] === value);
  });
}

/**
 * Assertion: all logs match a predicate
 */
export function allLogsMatch(name: string, predicate: (log: Log) => boolean): Assertion {
  return Assert.custom(name, (logs) => logs.every(predicate));
}

/**
 * Assertion: some logs match a predicate
 */
export function someLogsMatch(name: string, predicate: (log: Log) => boolean): Assertion {
  return Assert.custom(name, (logs) => logs.some(predicate));
}

// Re-export core actions as flat functions
export { Act };

/**
 * Browser action helpers - shortcuts for common browser operations
 */
export const browserAct = {
  /**
   * Navigate to a URL and wait for it to load
   */
  goto(url: string, options?: { headless?: boolean; waitMs?: number }): Action {
    return Act.browser({ url, ...options });
  },

  /**
   * Navigate to a URL with visible browser (headless: false)
   */
  gotoVisible(url: string, waitMs?: number): Action {
    return Act.browser({ url, headless: false, waitMs });
  },
};

/**
 * Command execution helpers
 */
export const execAct = {
  /**
   * Run a shell command
   */
  run(command: string, options?: { cwd?: string; timeoutMs?: number }): Action {
    return Act.exec(command, options);
  },

  /**
   * Run npm/bun command
   */
  npm(script: string, options?: { cwd?: string; timeoutMs?: number }): Action {
    return Act.exec(`npm run ${script}`, options);
  },

  /**
   * Run bun command
   */
  bun(script: string, options?: { cwd?: string; timeoutMs?: number }): Action {
    return Act.exec(`bun run ${script}`, options);
  },
};

/**
 * Cloudflare observe helpers - auto-configures from env vars if possible
 */
export const cloudflare = {
  /**
   * Observe Cloudflare worker logs via Analytics Engine
   *
   * Auto-uses CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN from env if not provided.
   */
  logs(options?: {
    dataset?: string;
    accountId?: string;
    apiToken?: string;
    pollInterval?: number;
  }): ObserveResource {
    const accountId = options?.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = options?.apiToken ?? process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      console.warn(
        "[cloudflare.logs] Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN. Returning empty observe resource."
      );
      return createEmptyObserveResource();
    }

    // Dynamic import to avoid hard dependency on cloudflare module
    const { CloudflareProvider } = require("./cloudflare/index");
    const provider = CloudflareProvider({ accountId, apiToken });
    return provider.observe({
      backend: "analytics",
      dataset: options?.dataset ?? "worker_logs",
      pollInterval: options?.pollInterval,
    });
  },

  /**
   * Observe Cloudflare worker logs via Workers Logs API
   */
  workersLogs(options: {
    workerName: string;
    accountId?: string;
    apiToken?: string;
    pollInterval?: number;
  }): ObserveResource {
    const accountId = options.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = options.apiToken ?? process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      console.warn(
        "[cloudflare.workersLogs] Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN. Returning empty observe resource."
      );
      return createEmptyObserveResource();
    }

    const { CloudflareProvider } = require("./cloudflare/index");
    const provider = CloudflareProvider({ accountId, apiToken });
    return provider.observe({
      backend: "workers-logs",
      workerName: options.workerName,
      pollInterval: options.pollInterval,
    });
  },

  /**
   * Observe via CLI stream (local development)
   */
  cliStream(options?: {
    workerName?: string;
    accountId?: string;
  }): ObserveResource {
    const accountId = options?.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!accountId) {
      console.warn(
        "[cloudflare.cliStream] Missing CLOUDFLARE_ACCOUNT_ID. Returning empty observe resource."
      );
      return createEmptyObserveResource();
    }

    const { CloudflareProvider } = require("./cloudflare/index");
    // CLI stream doesn't need apiToken
    const provider = CloudflareProvider({ accountId, apiToken: "" });
    return provider.observe({
      backend: "cli-stream",
      workerName: options?.workerName,
    });
  },
};

/**
 * Empty observe resource - useful for command-only gates
 */
export function emptyObserve(): ObserveResource {
  return createEmptyObserveResource();
}

/**
 * Shorthand gate spec with sensible defaults
 */
export interface ShorthandGateSpec {
  /** Observe resource for logs */
  observe?: ObserveResource;
  /** Actions to execute */
  act?: Action | Action[];
  /** Assertions to verify */
  assert?: Assertion | Assertion[];
  /** Timeout configuration */
  stop?: { idleMs: number; maxMs: number };
  /** Report format */
  report?: "json" | "pretty";
}

/**
 * Simplified gate function with sensible defaults.
 *
 * - `observe` defaults to empty (no logs collected)
 * - `act` and `assert` can be single items or arrays
 * - Returns a promise that resolves to the gate result
 *
 * @example
 * ```ts
 * const result = await gate("my-gate", {
 *   act: execAct.run("npm test"),
 *   assert: noErrors(),
 * });
 * ```
 */
export async function gate(name: string, spec: ShorthandGateSpec): Promise<GateResult> {
  const fullSpec: GateSpec = {
    name,
    observe: spec.observe ?? createEmptyObserveResource(),
    act: Array.isArray(spec.act) ? spec.act : spec.act ? [spec.act] : [],
    assert: Array.isArray(spec.assert) ? spec.assert : spec.assert ? [spec.assert] : [],
    stop: spec.stop,
    report: spec.report,
  };

  return Gate.run(fullSpec);
}

/**
 * Creates a gate that only runs a command and checks exit code.
 * Useful for build/test gates that don't need log observation.
 *
 * @example
 * ```ts
 * const result = await commandGate("build", "npm run build");
 * ```
 */
export async function commandGate(
  name: string,
  command: string,
  options?: { cwd?: string; timeoutMs?: number }
): Promise<GateResult> {
  return gate(name, {
    act: execAct.run(command, options),
    assert: noErrors(),
  });
}

/**
 * Creates a gate that navigates to a URL and runs assertions.
 *
 * @example
 * ```ts
 * const result = await browserGate("homepage", "https://example.com", {
 *   assert: [hasAction("page_loaded"), noErrors()],
 * });
 * ```
 */
export async function browserGate(
  name: string,
  url: string,
  options?: {
    observe?: ObserveResource;
    assert?: Assertion | Assertion[];
    headless?: boolean;
    waitMs?: number;
  }
): Promise<GateResult> {
  return gate(name, {
    observe: options?.observe,
    act: browserAct.goto(url, { headless: options?.headless, waitMs: options?.waitMs }),
    assert: options?.assert ?? noErrors(),
  });
}

/**
 * Combines multiple assertions with AND logic (all must pass)
 */
export function allOf(...assertions: Assertion[]): Assertion[] {
  return assertions;
}

/**
 * Creates an assertion that passes if ANY of the given assertions pass.
 */
export function anyOf(...assertions: Assertion[]): Assertion {
  return Assert.custom(
    `AnyOf(${assertions.length} assertions)`,
    async (logs) => {
      for (const assertion of assertions) {
        if (assertion._tag === "NoErrors") {
          const hasError = logs.some(l => l.status === "error" || l.error);
          if (!hasError) return true;
        } else if (assertion._tag === "HasAction") {
          if (logs.some(l => l.action === assertion.action)) return true;
        } else if (assertion._tag === "HasStage") {
          if (logs.some(l => l.stage === assertion.stage)) return true;
        } else if (assertion._tag === "Custom") {
          const result = await Promise.resolve(assertion.fn(logs));
          if (result) return true;
        }
      }
      return false;
    }
  );
}

/**
 * Creates an assertion that negates another assertion.
 */
export function not(assertion: Assertion): Assertion {
  const name = assertion._tag === "Custom" ? assertion.name : assertion._tag;
  return Assert.custom(
    `Not(${name})`,
    async (logs) => {
      if (assertion._tag === "NoErrors") {
        return logs.some(l => l.status === "error" || l.error);
      } else if (assertion._tag === "HasAction") {
        return !logs.some(l => l.action === assertion.action);
      } else if (assertion._tag === "HasStage") {
        return !logs.some(l => l.stage === assertion.stage);
      } else if (assertion._tag === "Custom") {
        const result = await Promise.resolve(assertion.fn(logs));
        return !result;
      }
      return true;
    }
  );
}

/**
 * Agent action helpers — shortcuts for running AI agents in Filepath containers.
 *
 * @example
 * ```ts
 * import { agentAct } from "gateproof/shorthands";
 *
 * const result = await gate("fix-auth", {
 *   act: agentAct.run({
 *     name: "fix-auth",
 *     agent: "claude-code",
 *     model: "claude-sonnet-4-20250514",
 *     task: "Fix the authentication bug in src/auth.ts",
 *   }),
 *   assert: [hasAction("commit"), noErrors()],
 * });
 * ```
 */
export const agentAct = {
  /**
   * Run an AI agent in a Filepath container
   */
  run(config: import("./act").AgentActConfig): Action {
    return Act.agent(config);
  },

  /**
   * Run Claude Code agent with a task
   */
  claudeCode(task: string, options?: Partial<import("./act").AgentActConfig>): Action {
    return Act.agent({
      name: options?.name ?? "claude-code",
      agent: "claude-code",
      model: options?.model ?? "claude-sonnet-4-20250514",
      task,
      ...options,
    });
  },

  /**
   * Run Codex agent with a task
   */
  codex(task: string, options?: Partial<import("./act").AgentActConfig>): Action {
    return Act.agent({
      name: options?.name ?? "codex",
      agent: "codex",
      model: options?.model ?? "gpt-4o",
      task,
      ...options,
    });
  },
};

/**
 * Creates a gate that runs an AI agent and checks for commits/completion.
 *
 * @example
 * ```ts
 * const result = await agentGate("fix-bug", {
 *   agent: "claude-code",
 *   model: "claude-sonnet-4-20250514",
 *   task: "Fix the off-by-one error in pagination.ts",
 * });
 * ```
 */
export async function agentGate(
  name: string,
  config: Omit<import("./act").AgentActConfig, "name"> & { name?: string },
  options?: {
    observe?: ObserveResource;
    assert?: Assertion | Assertion[];
  }
): Promise<GateResult> {
  return gate(name, {
    observe: options?.observe,
    act: Act.agent({ name: config.name ?? name, ...config } as import("./act").AgentActConfig),
    assert: options?.assert ?? [hasAction("done"), noErrors()],
  });
}

// Re-export Gate for escape hatch to full API
export { Gate };
export type { GateSpec, GateResult, Log, Assertion, Action, ObserveResource };
