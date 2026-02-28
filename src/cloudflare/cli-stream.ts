import { spawn } from "node:child_process";
import { Effect, Queue, Either, Runtime } from "effect";
import type { Log, LogStream } from "../types";
import { ObservabilityError, createLogStreamFromQueue, createObservabilityError, type Backend } from "../observe";

export interface CliStreamConfig {
  accountId?: string;
  workerName?: string;
}

function parseLogLine(line: string): Effect.Effect<Log, ObservabilityError> {
  return Effect.gen(function* () {
    const parsed = yield* Effect.try<Log & { message?: unknown }, ObservabilityError>({
      try: () => JSON.parse(line) as Log & { message?: unknown },
      catch: (e) => createObservabilityError(e)
    });

    const msg = parsed.message;
    
    if (typeof msg === "string") {
      const innerResult = yield* Effect.try<unknown, ObservabilityError>({
        try: () => JSON.parse(msg),
        catch: () => createObservabilityError(new Error("Failed to parse inner JSON"))
      }).pipe(Effect.either);

      if (Either.isRight(innerResult) && innerResult.right && typeof innerResult.right === "object") {
        const merged = {
          ...parsed,
          ...(innerResult.right as Record<string, unknown>)
        } as Log;
        return merged;
      }
    }
    
    return parsed as Log;
  }).pipe(Effect.withSpan("CliStream.parseLogLine"));
}

export function createCliStreamBackend(
  config: CliStreamConfig
): Backend {
  let proc: ReturnType<typeof spawn> | null = null;

  const releaseProcess = (procToRelease: ReturnType<typeof spawn>): Effect.Effect<void, ObservabilityError> => {
    return Effect.gen(function* () {
      procToRelease.kill("SIGTERM");
      yield* Effect.tryPromise({
        try: () => new Promise<void>((resolve) => {
          procToRelease.on("exit", () => resolve());
          procToRelease.on("close", () => resolve());
          setTimeout(() => resolve(), 1000);
        }),
        catch: () => createObservabilityError(new Error("Process cleanup failed"))
      }).pipe(
        Effect.tapError((error) =>
          Effect.logError("Process cleanup error", error)
        ),
        // Swallow errors during cleanup - already logged above
        Effect.catchAll(() => Effect.void)
      );
    });
  };

  return {
    start() {
      return Effect.gen(function* () {
        const queue = yield* Queue.unbounded<Log>();

        const args: string[] = ["tail"];
        if (config.workerName) args.push(config.workerName);
        args.push("--format", "json");

        const env: NodeJS.ProcessEnv = { ...process.env };
        if (config.accountId) {
          env.CLOUDFLARE_ACCOUNT_ID = config.accountId;
        }

        proc = spawn("wrangler", args, {
          stdio: ["ignore", "pipe", "pipe"],
          env
        });

        if (!proc.stdout || !proc.stderr) {
          yield* Effect.fail(createObservabilityError(new Error("Failed to spawn wrangler")));
        }

        const runtime = Runtime.defaultRuntime;
        proc.stdout!.on("data", (buf: Buffer) => {
          const lines = buf.toString("utf8").split("\n").filter(Boolean);
          for (const line of lines) {
            Runtime.runPromise(runtime)(
              parseLogLine(line).pipe(
                Effect.flatMap((log) => Queue.offer(queue, log)),
                Effect.tapError((error) =>
                  Effect.logError("Failed to parse log line", error)
                ),
                Effect.catchAll(() => Effect.void)
              )
            );
          }
        });

        proc.stderr!.on("data", (buf: Buffer) => {
          process.stderr.write(buf);
        });

        return createLogStreamFromQueue(queue);
      }).pipe(
        Effect.catchAll((cause) =>
          Effect.fail(createObservabilityError(cause))
        )
      );
    },
    stop() {
      return Effect.gen(function* () {
        if (proc) {
          yield* releaseProcess(proc);
          proc = null;
        }
      });
    }
  };
}
