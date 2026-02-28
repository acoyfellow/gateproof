import { Effect, Schedule } from "effect";
import type { Log, LogStream } from "../types";
import { ObservabilityError, createObservabilityError, type Backend } from "../observe";
import { createPollingBackend, type PollingBackend } from "./polling-backend";

export interface WorkersLogsConfig {
  accountId: string;
  apiToken: string;
  workerName: string;
  pollInterval?: number;
}

export function createWorkersLogsBackend(
  config: WorkersLogsConfig
): Backend {
  const fetchLogs = (lastTs: number): Effect.Effect<Log[], ObservabilityError, never> => {
    return Effect.gen(function* () {
      const response = yield* Effect.tryPromise({
        try: async () => {
          return await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/workers/${config.workerName}/logs`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${config.apiToken}`,
                "Content-Type": "application/json"
              }
            }
          );
        },
        catch: (e) => createObservabilityError(e)
      }).pipe(
        Effect.timeout("30 seconds"),
        Effect.retry(Schedule.exponential("100 millis").pipe(Schedule.compose(Schedule.recurs(3)))),
        Effect.catchTag("TimeoutException", (e) => Effect.fail(createObservabilityError(e)))
      ) as Effect.Effect<Response, ObservabilityError>;

      if (!response.ok) {
        yield* Effect.fail(createObservabilityError(new Error(`API request failed: ${response.status}`)));
      }

      const data = yield* Effect.tryPromise({
        try: async () => (await response.json()) as { result?: Log[] },
        catch: (e) => createObservabilityError(e)
      });
      const logs = data.result && Array.isArray(data.result) ? data.result : [];
      return logs.filter((log) => {
        if (log.timestamp) {
          const ts = new Date(log.timestamp).getTime();
          return ts > lastTs;
        }
        return false;
      });
    }).pipe(Effect.withSpan("WorkersLogsBackend.fetchLogs"));
  };

  const backend: PollingBackend<Log> = {
    fetchData: fetchLogs,
    processData(logs, lastTimestamp) {
      let newTimestamp = lastTimestamp;
      for (const log of logs) {
        if (log.timestamp) {
          const ts = new Date(log.timestamp).getTime();
          newTimestamp = Math.max(newTimestamp, ts);
        }
      }
      return { logs, newTimestamp };
    }
  };

  return createPollingBackend({ pollInterval: config.pollInterval ?? 1000 }, backend);
}
