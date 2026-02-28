import { Effect, Queue, Ref, Fiber, Schedule } from "effect";
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
  const maxRetries = config.maxRetries ?? 2;
  const circuitBreakerThreshold = config.circuitBreakerThreshold ?? 5;
  const baseInterval = config.pollInterval ?? HTTP_DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = config.timeoutMs ?? HTTP_DEFAULT_TIMEOUT_MS;
  const maxResponseSizeBytes = config.maxResponseSizeBytes ?? HTTP_MAX_RESPONSE_SIZE_BYTES;

  const stoppedRef = Ref.unsafeMake(false);
  const consecutiveFailuresRef = Ref.unsafeMake(0);
  const circuitOpenRef = Ref.unsafeMake(false);
  const fiberRef = Ref.unsafeMake<Fiber.RuntimeFiber<void, never> | null>(null);

  const fetchOnce = Effect.tryPromise({
    try: () => fetch(config.url, {
      method: config.method || "GET",
      headers: config.headers,
      body: config.body,
      signal: AbortSignal.timeout(timeoutMs),
    }),
    catch: (e) => e as Error
  });

  const fetchWithRetry = fetchOnce.pipe(
    Effect.retry(
      Schedule.exponential("500 millis").pipe(
        Schedule.compose(Schedule.recurs(maxRetries))
      )
    )
  );

  const pollOnce = (queue: Queue.Queue<Log>): Effect.Effect<void> =>
    Effect.gen(function* () {
      const isStopped = yield* Ref.get(stoppedRef);
      if (isStopped) return;

      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      const action = `${config.method || "GET"} ${config.url}`;

      const result = yield* fetchWithRetry.pipe(Effect.either);

      if (result._tag === "Left") {
        const failures = yield* Ref.updateAndGet(consecutiveFailuresRef, (n) => n + 1);
        const error = result.left instanceof Error ? result.left : new Error(String(result.left));
        const durationMs = Date.now() - startTime;
        const isCircuitOpen = failures >= circuitBreakerThreshold;

        if (isCircuitOpen) {
          yield* Ref.set(circuitOpenRef, true);
        }

        const log: Log = {
          requestId,
          timestamp: new Date().toISOString(),
          stage: "http",
          action,
          status: "error",
          durationMs,
          error: {
            tag: isCircuitOpen ? "HttpCircuitOpen" : (error.name || "HttpError"),
            message: isCircuitOpen
              ? `${failures} consecutive failures, backing off: ${error.message}`
              : (error.message || String(error)),
            stack: error.stack,
          },
        };

        yield* Queue.offer(queue, log).pipe(
          Effect.tapError((enqueueError) =>
            Effect.logError("Failed to enqueue HTTP error log", enqueueError)
          ),
          Effect.catchAll(() => Effect.void)
        );
        return;
      }

      // Success — reset circuit breaker
      yield* Ref.set(consecutiveFailuresRef, 0);
      yield* Ref.set(circuitOpenRef, false);

      const response = result.right;
      const durationMs = Date.now() - startTime;
      const contentType = response.headers.get("content-type") || "";

      const contentLengthHeader = response.headers.get("content-length");
      const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;

      if (typeof contentLength === "number" && !Number.isNaN(contentLength) && contentLength > maxResponseSizeBytes) {
        const log: Log = {
          requestId,
          timestamp: new Date().toISOString(),
          stage: "http",
          action,
          status: "error",
          durationMs,
          error: {
            tag: "HttpResponseTooLarge",
            message: `Response size ${contentLength} exceeds limit ${maxResponseSizeBytes}`,
          },
        };

        yield* Queue.offer(queue, log).pipe(
          Effect.tapError((error) =>
            Effect.logError("Failed to enqueue HTTP size-limit log", error)
          ),
          Effect.catchAll(() => Effect.void)
        );
        return;
      }

      let body: unknown = null;
      if (contentType.includes("application/json")) {
        body = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: () => null
        }).pipe(Effect.catchAll(() => Effect.succeed(null)));
      } else {
        body = yield* Effect.tryPromise({
          try: () => response.text(),
          catch: () => null
        }).pipe(Effect.catchAll(() => Effect.succeed(null)));
      }

      const log: Log = {
        requestId,
        timestamp: new Date().toISOString(),
        stage: "http",
        action,
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

      yield* Queue.offer(queue, log).pipe(
        Effect.tapError((error) =>
          Effect.logError("Failed to enqueue HTTP log", error)
        ),
        Effect.catchAll(() => Effect.void)
      );
    }).pipe(Effect.withSpan("HttpBackend.pollOnce"));

  const pollLoop = (queue: Queue.Queue<Log>): Effect.Effect<void> =>
    Effect.gen(function* () {
      while (true) {
        const isStopped = yield* Ref.get(stoppedRef);
        if (isStopped) break;

        yield* pollOnce(queue);

        // Circuit breaker: use slower interval when open
        const isCircuitOpen = yield* Ref.get(circuitOpenRef);
        const interval = isCircuitOpen ? baseInterval * 5 : baseInterval;
        yield* Effect.sleep(`${interval} millis`);
      }
    });

  return {
    start() {
      return Effect.gen(function* () {
        yield* Ref.set(stoppedRef, false);
        yield* Ref.set(consecutiveFailuresRef, 0);
        yield* Ref.set(circuitOpenRef, false);
        const queue = yield* Queue.bounded<Log>(1000);

        // Initial poll
        yield* pollOnce(queue);

        // Start polling loop
        const fiber = yield* Effect.forkDaemon(
          pollLoop(queue).pipe(
            Effect.tapError((error) =>
              Effect.logError("HTTP polling failed", error)
            )
          )
        );
        yield* Ref.set(fiberRef, fiber);

        return createLogStreamFromQueue(queue);
      }).pipe(Effect.withSpan("HttpBackend.start"));
    },
    stop() {
      return Effect.gen(function* () {
        yield* Ref.set(stoppedRef, true);
        const fiber = yield* Ref.get(fiberRef);
        if (fiber) {
          yield* Fiber.interrupt(fiber);
          yield* Ref.set(fiberRef, null);
        }
      }).pipe(Effect.withSpan("HttpBackend.stop"));
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
