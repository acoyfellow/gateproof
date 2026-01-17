import { Effect, Schedule, Ref } from "effect";
import type { Log, LogStream } from "../types";
import { ObservabilityError, createObservabilityError, type Backend } from "../observe";
import { createPollingBackend, type PollingBackend } from "./polling-backend";

export interface AnalyticsConfig {
  accountId: string;
  apiToken: string;
  dataset: string;
  pollInterval?: number;
}

type Row = {
  requestId?: string;
  stage?: string;
  action?: string;
  status?: string;
  durableObjectId?: string;
  containerId?: string;
  errorTag?: string;
  errorMessage?: string;
  data?: string;
  durationMs?: number;
  timestamp?: number;
};

export function createAnalyticsBackend(
  config: AnalyticsConfig
): Backend {
  const cacheRef = Ref.unsafeMake<Map<string, { data: Row[]; timestamp: number }>>(new Map());
  const CACHE_TTL = 5000;
  const lastRequestRef = Ref.unsafeMake<number>(0);
  const MIN_REQUEST_INTERVAL = 100;

  const fetchRows = (lastTimestamp: number): Effect.Effect<Row[], ObservabilityError, never> => {
    const cacheKey = `${config.dataset}:${lastTimestamp}`;

    return Effect.gen(function* () {
      const cache = yield* Ref.get(cacheRef);
      const cached = cache.get(cacheKey);
      const now = Date.now();
      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        return cached.data;
      }

      const query = `SELECT blob1 AS requestId, blob2 AS stage, blob3 AS action, blob4 AS status, blob5 AS durableObjectId, blob6 AS containerId, blob7 AS errorTag, blob8 AS errorMessage, blob9 AS data, double1 AS durationMs, double2 AS timestamp FROM ${config.dataset} WHERE double2 > ${lastTimestamp} ORDER BY double2 ASC LIMIT 100`;
      const response = yield* Effect.tryPromise({
        try: async () => {
          return await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/analytics_engine/sql`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${config.apiToken}`,
                "Content-Type": "text/plain"
              },
              body: query
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
        try: async () => (await response.json()) as { result?: Row[] },
        catch: (e) => createObservabilityError(e)
      });
      const rows = data.result && Array.isArray(data.result) ? data.result : [];
      
      yield* Ref.update(cacheRef, (cache) => {
        const newCache = new Map(cache);
        newCache.set(cacheKey, { data: rows, timestamp: now });
        if (newCache.size > 100) {
          const entries = Array.from(newCache.entries());
          entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
          return new Map(entries.slice(0, 100));
        }
        return newCache;
      });
      
      return rows;
    });
  };

  const parseRow = (row: Row): Log | null => {
    if (!row.timestamp || !row.requestId) return null;

    return {
      requestId: row.requestId,
      timestamp: new Date(row.timestamp).toISOString(),
      stage: (row.stage || "worker") as "worker" | "durable_object" | "container",
      action: row.action || "unknown",
      status: (row.status || "info") as "start" | "success" | "error" | "info",
      ...(row.durableObjectId && { durableObjectId: row.durableObjectId }),
      ...(row.containerId && { containerId: row.containerId }),
      ...(row.errorTag && {
        error: {
          tag: row.errorTag,
          message: row.errorMessage || ""
        }
      }),
      ...(row.data && (() => {
        try {
          return { data: JSON.parse(row.data) };
        } catch {
          return {};
        }
      })()),
      ...(row.durationMs !== undefined && { durationMs: row.durationMs })
    };
  };

  const backend: PollingBackend<Row> = {
    fetchData: fetchRows,
    processData(rows, lastTimestamp) {
      const logs: Log[] = [];
      let newTimestamp = lastTimestamp;

      for (const row of rows) {
        const log = parseRow(row);
        if (log) {
          logs.push(log);
          newTimestamp = Math.max(newTimestamp, row.timestamp || newTimestamp);
        }
      }

      return { logs, newTimestamp };
    }
  };

  return createPollingBackend({ pollInterval: config.pollInterval ?? 1000 }, backend);
}
