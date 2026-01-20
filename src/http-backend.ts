import { Effect, Queue } from "effect";
import type { Log, LogStream } from "./types";
import { createLogStreamFromQueue, createObservabilityError, createObserveResource, type ObserveResource } from "./observe";

export interface HttpObserveConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  pollInterval?: number;
}

/**
 * Creates an observe resource that polls an HTTP endpoint and captures responses as logs.
 * This gives agents visibility into what the endpoint is returning.
 */
export function createHttpObserveResource(config: HttpObserveConfig): ObserveResource {
  let queue: Queue.Queue<Log> | null = null;
  let stopped = false;
  let pollTimer: Timer | null = null;

  const poll = async () => {
    if (stopped || !queue) return;

    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      const response = await fetch(config.url, {
        method: config.method || "GET",
        headers: config.headers,
        body: config.body,
        signal: AbortSignal.timeout(5000),
      });

      const durationMs = Date.now() - startTime;
      const contentType = response.headers.get("content-type") || "";
      let body: unknown;

      if (contentType.includes("application/json")) {
        body = await response.json().catch(() => null);
      } else {
        body = await response.text().catch(() => null);
      }

      const log: Log = {
        requestId,
        timestamp: new Date().toISOString(),
        stage: "http",
        action: `${config.method || "GET"} ${config.url}`,
        status: response.ok ? "success" : "error",
        durationMs,
        data: {
          statusCode: response.status,
          statusText: response.statusText,
          contentType,
          body,
          headers: Object.fromEntries(response.headers.entries()),
        },
      };

      await Effect.runPromise(Queue.offer(queue, log).pipe(Effect.catchAll(() => Effect.void)));
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      const log: Log = {
        requestId,
        timestamp: new Date().toISOString(),
        stage: "http",
        action: `${config.method || "GET"} ${config.url}`,
        status: "error",
        durationMs,
        error: {
          tag: error.name || "HttpError",
          message: error.message || String(error),
          stack: error.stack,
        },
      };

      await Effect.runPromise(Queue.offer(queue, log).pipe(Effect.catchAll(() => Effect.void)));
    }
  };

  return {
    start() {
      return Effect.gen(function* () {
        stopped = false;
        queue = yield* Queue.bounded<Log>(1000);

        // Initial poll
        yield* Effect.promise(() => poll());

        // Start polling loop
        const interval = config.pollInterval ?? 1000;
        pollTimer = setInterval(() => poll(), interval);

        return createLogStreamFromQueue(queue);
      });
    },
    stop() {
      return Effect.gen(function* () {
        stopped = true;
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      });
    },
    query(filter) {
      return Effect.succeed([]);
    },
  };
}
