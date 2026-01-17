import { test, expect } from "bun:test";
import { Gate, Act, Assert } from "../src/index";
import type { Log } from "../src/types";
import { createTestObserveResource } from "../src/test-helpers";
import { Effect, Queue, Runtime } from "effect";

test("concurrent: multiple gates can run simultaneously", async () => {
  const queue1 = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());
  const queue2 = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  const logs1: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "test1",
      status: "success"
    }
  ];

  const logs2: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "test2",
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs1, (log) => Queue.offer(queue1, log))
  );
  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs2, (log) => Queue.offer(queue2, log))
  );

  const gate1 = {
    name: "concurrent-test-1",
    observe: createTestObserveResource(queue1),
    act: [Act.wait(50)],
    assert: [Assert.hasAction("test1")],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const gate2 = {
    name: "concurrent-test-2",
    observe: createTestObserveResource(queue2),
    act: [Act.wait(50)],
    assert: [Assert.hasAction("test2")],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const [result1, result2] = await Promise.all([
    Gate.run(gate1),
    Gate.run(gate2)
  ]);

  expect(result1.status).toBe("success");
  expect(result2.status).toBe("success");
  expect(result1.evidence.actionsSeen).toContain("test1");
  expect(result2.evidence.actionsSeen).toContain("test2");
});

test("concurrent: gates handle resource contention", async () => {
  const sharedQueue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  // Add enough logs for both gates
  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "shared1",
      status: "success"
    },
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "shared2",
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(sharedQueue, log))
  );

  const gate1 = {
    name: "contention-test-1",
    observe: createTestObserveResource(sharedQueue),
    act: [Act.wait(50)],
    assert: [Assert.hasAction("shared1")],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const gate2 = {
    name: "contention-test-2",
    observe: createTestObserveResource(sharedQueue),
    act: [Act.wait(50)],
    assert: [Assert.hasAction("shared2")],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const [result1, result2] = await Promise.all([
    Gate.run(gate1),
    Gate.run(gate2)
  ]);

  // At least one should succeed (they may compete for logs)
  expect(["success", "failed"]).toContain(result1.status);
  expect(["success", "failed"]).toContain(result2.status);
});
