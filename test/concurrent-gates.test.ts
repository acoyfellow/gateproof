import { test, expect } from "bun:test";
import { Gate, Act, Assert } from "../src/index";
import { createTestObserveResource } from "../src/test-helpers";
import { Effect, Queue, Runtime } from "effect";
import type { Log } from "../src/types";

test("concurrent gates: independent execution", async () => {
  const queue1 = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());
  const queue2 = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  const log1: Log = {
    timestamp: new Date().toISOString(),
    stage: "gate1",
    action: "action1",
    status: "success"
  };

  const log2: Log = {
    timestamp: new Date().toISOString(),
    stage: "gate2",
    action: "action2",
    status: "success"
  };

  await Runtime.runPromise(Runtime.defaultRuntime)(Queue.offer(queue1, log1));
  await Runtime.runPromise(Runtime.defaultRuntime)(Queue.offer(queue2, log2));

  const gate1 = {
    name: "concurrent-gate-1",
    observe: createTestObserveResource(queue1),
    act: [Act.wait(50)],
    assert: [Assert.hasAction("action1")],
    stop: { idleMs: 100, maxMs: 1000 }
  };

  const gate2 = {
    name: "concurrent-gate-2",
    observe: createTestObserveResource(queue2),
    act: [Act.wait(50)],
    assert: [Assert.hasAction("action2")],
    stop: { idleMs: 100, maxMs: 1000 }
  };

  // Run concurrently
  const [result1, result2] = await Promise.all([
    Gate.run(gate1),
    Gate.run(gate2)
  ]);

  expect(result1.status).toBe("success");
  expect(result2.status).toBe("success");
  expect(result1.evidence.actionsSeen).toContain("action1");
  expect(result2.evidence.actionsSeen).toContain("action2");
  expect(result1.evidence.actionsSeen).not.toContain("action2");
  expect(result2.evidence.actionsSeen).not.toContain("action1");
});
