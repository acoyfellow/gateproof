import { Effect, Schedule } from "effect";
import type { Browser, Page } from "playwright";
import type { Action } from "./act";
import { GateError } from "./index";
import { validateCommand, validateUrl, validateWorkerName } from "./validation";
import type { FilepathRuntime } from "./filepath-backend";

export interface ActionExecutor {
  execute(action: Action): Effect.Effect<void, GateError>;
}

export const WaitExecutor: ActionExecutor = {
  execute(action) {
    if (action._tag !== "Wait") {
      return Effect.fail(new GateError({ cause: new Error("Invalid action") }));
    }
    if (action.ms < 0 || action.ms > 3600000) {
      return Effect.fail(new GateError({ cause: new Error("Wait time must be between 0 and 3600000ms") }));
    }
    return Effect.sleep(`${action.ms} millis`).pipe(Effect.withSpan("WaitExecutor.execute"));
  }
};

export const DeployExecutor: ActionExecutor = {
  execute(action) {
    if (action._tag !== "Deploy") {
      return Effect.fail(new GateError({ cause: new Error("Invalid action") }));
    }
    return Effect.gen(function* () {
      yield* validateWorkerName(action.worker);
      yield* Effect.tryPromise({
        try: async () => {
          const { spawn } = await import("node:child_process");
          return new Promise<void>((resolve, reject) => {
            const proc = spawn("wrangler", ["deploy"], {
              shell: false,
              stdio: "inherit",
              env: { ...process.env }
            });
            proc.on("close", (code) => {
              if (code === 0) resolve();
              else reject(new Error(`Deployment failed with code ${code}`));
            });
            proc.on("error", reject);
          });
        },
        catch: (e) => new GateError({ cause: e })
      }).pipe(
        Effect.timeout("5 minutes"),
        Effect.retry(Schedule.exponential("1 second").pipe(Schedule.compose(Schedule.recurs(2)))),
        Effect.catchTag("TimeoutException", (e) => Effect.fail(new GateError({ cause: e })))
      );
    }).pipe(Effect.withSpan("DeployExecutor.execute"));
  }
};

/**
 * Executes shell commands.
 * 
 * **SECURITY WARNING**: Commands are executed with `shell: true`, which means
 * shell interpretation occurs. The `validateCommand` function blocks dangerous
 * characters, but this executor should only be used with trusted input.
 * 
 * For untrusted input, consider using `execFile` with explicit argument arrays
 * instead of shell execution.
 */
export const ExecExecutor: ActionExecutor = {
  execute(action) {
    if (action._tag !== "Exec") {
      return Effect.fail(new GateError({ cause: new Error("Invalid action") }));
    }
    return Effect.gen(function* () {
      yield* validateCommand(action.command);
      yield* Effect.tryPromise({
        try: async () => {
          const { spawn } = await import("node:child_process");
          return new Promise<void>((resolve, reject) => {
            const proc = spawn(action.command, { shell: true, cwd: action.cwd });
            let stderr = "";
            proc.stderr?.on("data", (data) => {
              stderr += data.toString();
            });
            proc.on("close", (code) => {
              if (code === 0) resolve();
              else reject(new Error(`Command failed with code ${code}${stderr ? `: ${stderr}` : ""}`));
            });
            proc.on("error", reject);
          });
        },
        catch: (e) => new GateError({ cause: e })
      }).pipe(
        Effect.timeout(`${action.timeoutMs ?? 30000} millis`),
        Effect.retry(Schedule.exponential("100 millis").pipe(Schedule.compose(Schedule.recurs(3)))),
        Effect.catchTag("TimeoutException", (e) => Effect.fail(new GateError({ cause: e })))
      );
    }).pipe(Effect.withSpan("ExecExecutor.execute"));
  }
};

export const BrowserExecutor: ActionExecutor = {
  execute(action) {
    if (action._tag !== "Browser") {
      return Effect.fail(new GateError({ cause: new Error("Invalid action") }));
    }
    return Effect.gen(function* () {
      yield* validateUrl(action.url);
      yield* Effect.acquireUseRelease(
        Effect.tryPromise({
          try: async () => {
            const pw = await import("playwright");
            const browser: Browser = await pw.chromium.launch({ headless: action.headless });
            return browser;
          },
          catch: (e) => new GateError({ cause: new Error(`Playwright not available: ${e instanceof Error ? e.message : String(e)}`) })
        }),
        (browser) =>
          Effect.gen(function* () {
            const page = yield* Effect.tryPromise({
              try: () => (browser as Browser).newPage(),
              catch: (e) => new GateError({ cause: e })
            });
            yield* Effect.tryPromise({
              try: () => (page as Page).goto(action.url),
              catch: (e) => new GateError({ cause: e })
            });
            yield* Effect.sleep(`${action.waitMs ?? 5000} millis`);
          }),
        (browser) =>
          Effect.tryPromise({
            try: () => (browser as Browser).close(),
            catch: () => undefined
          }).pipe(Effect.catchAll(() => Effect.void))
      ).pipe(
        Effect.timeout(`${(action.waitMs ?? 5000) + 10000} millis`),
        Effect.catchTag("TimeoutException", (e) => Effect.fail(new GateError({ cause: e })))
      );
    }).pipe(Effect.withSpan("BrowserExecutor.execute"));
  }
};

/**
 * Executes an AI agent in a Filepath container.
 *
 * The agent runs in an isolated container, communicating via the
 * Filepath Agent Protocol (FAP). NDJSON events on stdout are consumed
 * by the observe layer; this executor just manages the lifecycle.
 *
 * When no FilepathRuntime is configured, the executor fails with a
 * clear error message — it does not silently skip.
 */
export function createAgentExecutor(runtime?: FilepathRuntime): ActionExecutor {
  return {
    execute(action) {
      if (action._tag !== "Agent") {
        return Effect.fail(new GateError({ cause: new Error("Invalid action") }));
      }
      if (!runtime) {
        return Effect.fail(
          new GateError({
            cause: new Error(
              "Act.agent() requires a FilepathRuntime. " +
              "Provide one via createAgentExecutor(runtime) or use a mock for testing."
            ),
          })
        );
      }
      const config = action.config;
      const timeoutMs = config.timeoutMs ?? 300_000;
      return Effect.gen(function* () {
        const container = yield* Effect.tryPromise({
          try: () => runtime.spawn(config),
          catch: (e) =>
            new GateError({
              cause: new Error(
                `Failed to spawn agent "${config.name}": ${e instanceof Error ? e.message : String(e)}`
              ),
            }),
        });
        // Wait for the container to finish (the observe layer reads stdout separately).
        // We just need to ensure the container lifecycle completes within timeout.
        yield* Effect.tryPromise({
          try: async () => {
            for await (const _line of container.stdout) {
              // Drain stdout — the observe resource also reads this stream.
              // In a real implementation, the container's stdout would be tee'd.
            }
          },
          catch: (e) =>
            new GateError({
              cause: new Error(
                `Agent "${config.name}" failed: ${e instanceof Error ? e.message : String(e)}`
              ),
            }),
        }).pipe(
          Effect.timeout(`${timeoutMs} millis`),
          Effect.catchTag("TimeoutException", (e) =>
            Effect.fail(
              new GateError({
                cause: new Error(`Agent "${config.name}" timed out after ${timeoutMs}ms`),
              })
            )
          )
        );
      }).pipe(Effect.withSpan("AgentExecutor.execute"));
    },
  };
}

let _agentRuntime: FilepathRuntime | undefined;

/**
 * Set the global FilepathRuntime for agent execution.
 * Call this once at startup if using Act.agent().
 */
export function setFilepathRuntime(runtime: FilepathRuntime): void {
  _agentRuntime = runtime;
}

export function getActionExecutor(action: Action): ActionExecutor {
  switch (action._tag) {
    case "Wait":
      return WaitExecutor;
    case "Deploy":
      return DeployExecutor;
    case "Exec":
      return ExecExecutor;
    case "Browser":
      return BrowserExecutor;
    case "Agent":
      return createAgentExecutor(_agentRuntime);
    default: {
      const _exhaustive: never = action;
      return { execute: () => Effect.die(new Error(`Unknown action type: ${(action as Action)._tag}`)) };
    }
  }
}
