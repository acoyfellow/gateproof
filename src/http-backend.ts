import { Effect, Queue } from "effect";
import type { Log } from "./types";
import { createLogStreamFromQueue, type ObserveResource } from "./observe";
import {
  HTTP_DEFAULT_POLL_INTERVAL_MS,
  HTTP_DEFAULT_TIMEOUT_MS,
  HTTP_MAX_RESPONSE_SIZE_BYTES
} from "./constants";

export interface HttpObserveConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  pollInterval?: number;
  /**
   * Request timeout in milliseconds. Defaults to 5000.
   */
  timeoutMs?: number;
  /**
   * Maximum allowed response size in bytes. Defaults to 10MB.
   * If Content-Length exceeds this, the body is not read and an error log is emitted instead.
   */
  maxResponseSizeBytes?: number;
  /**
   * Max retries per poll on transient network errors (default: 2).
   * Uses exponential backoff: 500ms, 1s, 2s.
   */
  maxRetries?: number;
  /**
   * Consecutive failures before the circuit breaker opens and slows polling (default: 5).
   */
  circuitBreakerThreshold?: number;
}

/**
 * Creates an observe resource that polls an HTTP endpoint and captures responses as logs.
 * This gives agents visibility into what the endpoint is returning.
 */
export function createHttpObserveResource(config: HttpObserveConfig): ObserveResource {
  let queue: Queue.Queue<Log> | null = null;
  let stopped = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const maxRetries = config.maxRetries ?? 2;
  const circuitBreakerThreshold = config.circuitBreakerThreshold ?? 5;
  const baseInterval = config.pollInterval ?? HTTP_DEFAULT_POLL_INTERVAL_MS;
  let consecutiveFailures = 0;
  let circuitOpen = false;

  const fetchOnce = async (timeoutMs: number): Promise<Response> => {
    return fetch(config.url, {
      method: config.method || "GET",
      headers: config.headers,
      body: config.body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  };

  const fetchWithRetry = async (timeoutMs: number): Promise<Response> => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fetchOnce(timeoutMs);
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          const backoffMs = 500 * Math.pow(2, attempt); // 500ms, 1s, 2s
          await new Promise((r) => setTimeout(r, backoffMs));
        }
      }
    }
    throw lastError;
  };

  const poll = async () => {
    if (stopped || !queue) return;

    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    const timeoutMs = config.timeoutMs ?? HTTP_DEFAULT_TIMEOUT_MS;
    const maxResponseSizeBytes = config.maxResponseSizeBytes ?? HTTP_MAX_RESPONSE_SIZE_BYTES;

    try {
      const response = await fetchWithRetry(timeoutMs);

      // Reset circuit breaker on success; restore normal interval if recovering
      if (circuitOpen && pollTimer) {
        clearInterval(pollTimer);
        pollTimer = setInterval(() => poll(), baseInterval);
        circuitOpen = false;
      }
      consecutiveFailures = 0;

      const durationMs = Date.now() - startTime;
      const contentType = response.headers.get("content-type") || "";
      let body: unknown = null;

      const contentLengthHeader = response.headers.get("content-length");
      const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;

      if (typeof contentLength === "number" && !Number.isNaN(contentLength) && contentLength > maxResponseSizeBytes) {
        const log: Log = {
          requestId,
          timestamp: new Date().toISOString(),
          stage: "http",
          action: `${config.method || "GET"} ${config.url}`,
          status: "error",
          durationMs,
          error: {
            tag: "HttpResponseTooLarge",
            message: `Response size ${contentLength} exceeds limit ${maxResponseSizeBytes}`,
          },
        };

        await Effect.runPromise(
          Queue.offer(queue, log).pipe(
            Effect.tapError((error) =>
              Effect.logError("Failed to enqueue HTTP size-limit log", error)
            ),
            Effect.catchAll(() => Effect.void)
          )
        );
        return;
      }

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

      await Effect.runPromise(
        Queue.offer(queue, log).pipe(
          Effect.tapError((error) =>
            Effect.logError("Failed to enqueue HTTP log", error)
          ),
          Effect.catchAll(() => Effect.void)
        )
      );
    } catch (unknownError) {
      consecutiveFailures++;
      const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
      const durationMs = Date.now() - startTime;

      const isCircuitOpen = consecutiveFailures >= circuitBreakerThreshold;
      const log: Log = {
        requestId,
        timestamp: new Date().toISOString(),
        stage: "http",
        action: `${config.method || "GET"} ${config.url}`,
        status: "error",
        durationMs,
        error: {
          tag: isCircuitOpen ? "HttpCircuitOpen" : (error.name || "HttpError"),
          message: isCircuitOpen
            ? `${consecutiveFailures} consecutive failures, backing off: ${error.message}`
            : (error.message || String(error)),
          stack: error.stack,
        },
      };

      await Effect.runPromise(
        Queue.offer(queue, log).pipe(
          Effect.tapError((enqueueError) =>
            Effect.logError("Failed to enqueue HTTP error log", enqueueError)
          ),
          Effect.catchAll(() => Effect.void)
        )
      );

      // Circuit breaker: reschedule at a slower rate
      if (isCircuitOpen && !circuitOpen && pollTimer) {
        clearInterval(pollTimer);
        pollTimer = setInterval(() => poll(), baseInterval * 5);
        circuitOpen = true;
      }
    }
  };

  return {
    start() {
      return Effect.gen(function* () {
        stopped = false;
        consecutiveFailures = 0;
        queue = yield* Queue.bounded<Log>(1000);

        // Initial poll
        yield* Effect.promise(() => poll());

        // Start polling loop
        const interval = config.pollInterval ?? HTTP_DEFAULT_POLL_INTERVAL_MS;
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
    /**
     * Query historical logs.
     * 
     * Note: HTTP backend is forward-only and does not maintain historical logs.
     * This method always returns an empty array because HTTP polling only captures
     * logs as they arrive in real-time. For querying historical logs, use a backend
     * that supports log storage (e.g., Cloudflare Analytics Engine).
     */
    query(_filter) {
      return Effect.succeed([]);
    },
  };
}
