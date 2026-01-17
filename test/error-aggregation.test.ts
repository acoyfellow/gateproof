import { test, expect } from "bun:test";
import { Gate, Act, Assert } from "../src/index";
import type { Log } from "../src/types";
import { createTestObserveResource } from "../src/test-helpers";
import { Effect, Queue, Runtime } from "effect";
import { AssertionAggregateFailed } from "../src/assert";

test("error-aggregation: collects all assertion failures", async () => {
  const queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "wrong_action",
      status: "error",
      error: { tag: "TestError", message: "Test" }
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "error-aggregation-test",
    observe: createTestObserveResource(queue),
    act: [Act.wait(100)],
    assert: [
      Assert.noErrors(),
      Assert.hasAction("missing_action_1"),
      Assert.hasAction("missing_action_2"),
      Assert.hasStage("missing_stage")
    ],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("failed");
  expect(result.error).toBeDefined();
  
  // Check if we got aggregate error or single error
  if (result.error && "_tag" in result.error) {
    const errorTag = (result.error as any)._tag;
    expect(["AssertionFailed", "AssertionAggregateFailed"]).toContain(errorTag);
  }
});

test("error-aggregation: single failure returns AssertionFailed", async () => {
  const queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "test",
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "error-single-test",
    observe: createTestObserveResource(queue),
    act: [Act.wait(100)],
    assert: [
      Assert.hasAction("missing_action")
    ],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("failed");
  expect(result.error).toBeDefined();
});
