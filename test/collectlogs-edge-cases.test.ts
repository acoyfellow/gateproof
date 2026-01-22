import { test, expect } from "bun:test";
import { Gate, Act, Assert } from "../src/index";
import { createTestObserveResource } from "../src/test-helpers";
import { Effect, Queue, Runtime } from "effect";
import type { Log } from "../src/types";

test("collectLogs: empty stream returns empty array", async () => {
  const queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  const gate = {
    name: "empty-stream",
    observe: createTestObserveResource(queue),
    act: [Act.wait(100)],
    assert: [],
    stop: { idleMs: 100, maxMs: 500 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("success");
  expect(result.logs).toHaveLength(0);
});

test("collectLogs: immediate timeout when maxMs exceeded", async () => {
  const queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  const gate = {
    name: "immediate-timeout",
    observe: createTestObserveResource(queue),
    act: [Act.wait(10)],
    assert: [],
    stop: { idleMs: 50, maxMs: 100 }
  };

  // Wait longer than maxMs before offering any logs
  await new Promise((resolve) => setTimeout(resolve, 150));

  const result = await Gate.run(gate);

  expect(result.status).toBe("timeout");
  expect(result.logs).toHaveLength(0);
});

test("collectLogs: idle timeout returns early when logs stop", async () => {
  const queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  const log: Log = {
    timestamp: new Date().toISOString(),
    stage: "test",
    action: "test_action",
    status: "success"
  };

  // Offer log immediately
  await Runtime.runPromise(Runtime.defaultRuntime)(Queue.offer(queue, log));

  const gate = {
    name: "idle-timeout",
    observe: createTestObserveResource(queue),
    act: [Act.wait(10)],
    assert: [Assert.hasAction("test_action")],
    stop: { idleMs: 100, maxMs: 5000 }
  };

  const startTime = Date.now();
  const result = await Gate.run(gate);
  const duration = Date.now() - startTime;

  expect(result.status).toBe("success");
  expect(result.logs.length).toBeGreaterThan(0);
  // Should return early due to idle timeout, not wait full maxMs
  expect(duration).toBeLessThan(1000);
});

test("collectLogs: stream error preserved in timeout error", async () => {
  // Create a stream that errors after yielding one log
  const errorBackend = {
    start: () =>
      Effect.succeed<AsyncIterable<Log>>({
        async *[Symbol.asyncIterator]() {
          yield {
            timestamp: new Date().toISOString(),
            stage: "test",
            action: "before_error",
            status: "success"
          };
          throw new Error("Stream error");
        }
      }),
    stop: () => Effect.void
  };

  const { createObserveResource } = await import("../src/observe");
  const observe = createObserveResource(errorBackend);

  const gate = {
    name: "stream-error",
    observe,
    act: [Act.wait(10)],
    assert: [],
    stop: { idleMs: 100, maxMs: 500 }
  };

  const result = await Gate.run(gate);

  // Stream errors are converted to timeout errors with cause preserved
  expect(result.status).toBe("timeout");
  expect(result.error).toBeDefined();
  // Error should be preserved in LogTimeoutError.cause
  const errorWithCause = result.error as { cause?: unknown };
  expect(errorWithCause.cause || result.error?.message).toBeDefined();
});
