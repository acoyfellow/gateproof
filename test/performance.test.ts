import { test, expect } from "bun:test";
import { Gate, Act, Assert } from "../src/index";
import type { Log } from "../src/types";
import { createTestObserveResource } from "../src/test-helpers";
import { Effect, Queue, Runtime } from "effect";

async function withQueue<T>(fn: (queue: Queue.Queue<Log>) => Promise<T>): Promise<T> {
  const runtime = Runtime.defaultRuntime;
  const queue = await Runtime.runPromise(runtime)(Queue.unbounded<Log>());
  try {
    return await fn(queue);
  } finally {
    await Runtime.runPromise(runtime)(Queue.shutdown(queue));
  }
}

test("performance: handles large log volumes efficiently", () =>
  withQueue(async (queue) => {

  // Generate 1000 logs
  const logs: Log[] = Array.from({ length: 1000 }, (_, i) => ({
    timestamp: new Date().toISOString(),
    stage: "worker",
    action: `action_${i}`,
    status: "success" as const,
    requestId: `req-${i}`
  }));

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "performance-large-logs",
    observe: createTestObserveResource(queue),
    act: [Act.wait(100)],
    assert: [Assert.hasAction("action_500")],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const startTime = Date.now();
  const result = await Gate.run(gate);
  const duration = Date.now() - startTime;

  expect(result.status).toBe("success");
  expect(result.logs.length).toBeGreaterThan(0);
  expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  })
);

test("performance: memory usage is bounded", () =>
  withQueue(async (queue) => {

  // Generate logs that exceed the 50k limit
  const logs: Log[] = Array.from({ length: 60000 }, (_, i) => ({
    timestamp: new Date().toISOString(),
    stage: "worker",
    action: `action_${i}`,
    status: "success" as const
  }));

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "performance-memory-bound",
    observe: createTestObserveResource(queue),
    act: [Act.wait(100)],
    assert: [],
    stop: { idleMs: 1000, maxMs: 20000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("success");
  // Should be capped at 50k
  expect(result.logs.length).toBeLessThanOrEqual(50000);
  })
);

test("performance: throughput is acceptable", () =>
  withQueue(async (queue) => {

  const logs: Log[] = Array.from({ length: 100 }, (_, i) => ({
    timestamp: new Date().toISOString(),
    stage: "worker",
    action: `action_${i}`,
    status: "success" as const
  }));

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "performance-throughput",
    observe: createTestObserveResource(queue),
    act: [Act.wait(50)],
    assert: [],
    stop: { idleMs: 500, maxMs: 2000 }
  };

  const startTime = Date.now();
  const result = await Gate.run(gate);
  const duration = Date.now() - startTime;

  expect(result.status).toBe("success");
  expect(result.logs.length).toBe(100);
  expect(duration).toBeLessThan(2000); // Should process 100 logs quickly
  })
);
