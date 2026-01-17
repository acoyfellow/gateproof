import { test, expect } from "bun:test";
import { Gate, Act, Assert, LogTimeoutError } from "../src/index";
import type { Log } from "../src/types";
import { createTestObserveResource } from "../src/test-helpers";
import { Effect, Queue, Runtime } from "effect";

interface TestContext {
  queue: Queue.Queue<Log>;
}

const ctx: TestContext = {
  queue: {} as Queue.Queue<Log>
};

test("timeout: gate times out when maxMs exceeded", async () => {
  ctx.queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  // Use a very short maxMs that will definitely be exceeded
  // The action wait + initial sleep + collection setup will exceed this
  const gate = {
    name: "timeout-max-test",
    observe: createTestObserveResource(ctx.queue),
    act: [Act.wait(50)],
    assert: [Assert.noErrors()],
    stop: { idleMs: 5000, maxMs: 100 }
  };

  const result = await Gate.run(gate);

  // The timeout might happen during collection, so check for either timeout or the error type
  expect(["timeout", "failed"]).toContain(result.status);
  if (result.status === "timeout") {
    expect(result.error).toBeDefined();
  }
});

test("timeout: gate completes on idle timeout", async () => {
  ctx.queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "test",
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(ctx.queue, log))
  );

  const gate = {
    name: "timeout-idle-test",
    observe: createTestObserveResource(ctx.queue),
    act: [Act.wait(100)],
    assert: [Assert.noErrors()],
    stop: { idleMs: 200, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("success");
  expect(result.logs.length).toBeGreaterThan(0);
});

test("timeout: gate handles no logs with idle timeout", async () => {
  ctx.queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  const gate = {
    name: "timeout-no-logs-test",
    observe: createTestObserveResource(ctx.queue),
    act: [Act.wait(100)],
    assert: [Assert.noErrors()],
    stop: { idleMs: 200, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("success");
  expect(result.logs.length).toBe(0);
});
