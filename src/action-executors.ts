import { Effect, Schedule } from "effect";
import type { Action } from "./act";
import { GateError } from "./index";
import { validateCommand, validateUrl, validateWorkerName } from "./validation";

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
    return Effect.sleep(`${action.ms} millis`);
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
    });
  }
};

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
    });
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
            try {
              const pw = await import("playwright");
              return await pw.chromium.launch({ headless: action.headless });
            } catch (e) {
              throw new Error(`Playwright not available: ${e instanceof Error ? e.message : String(e)}`);
            }
          },
          catch: (e) => new GateError({ cause: e })
        }),
        (browser) =>
          Effect.gen(function* () {
            const page = yield* Effect.tryPromise({
              try: () => browser.newPage(),
              catch: (e) => new GateError({ cause: e })
            });
            yield* Effect.tryPromise({
              try: () => (page as any).goto(action.url),
              catch: (e) => new GateError({ cause: e })
            });
            yield* Effect.sleep(`${action.waitMs ?? 5000} millis`);
          }),
        (browser) =>
          Effect.tryPromise({
            try: () => (browser as any).close(),
            catch: () => undefined
          }).pipe(Effect.catchAll(() => Effect.void))
      ).pipe(
        Effect.timeout(`${(action.waitMs ?? 5000) + 10000} millis`),
        Effect.catchTag("TimeoutException", (e) => Effect.fail(new GateError({ cause: e })))
      );
    });
  }
};

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
    default:
      throw new Error(`Unknown action type: ${(action as any)._tag}`);
  }
}
