import { test, expect, beforeEach, afterEach } from "bun:test";
import { Gate, Act, Assert } from "../src/index";
import type { Log } from "../src/types";
import type { PreflightSpec } from "../src/preflight";
import { createTestObserveResource } from "../src/test-helpers";
import { Effect, Queue, Runtime } from "effect";

interface PreflightIntegrationTestContext {
  queue: Queue.Queue<Log>;
}

const ctx: PreflightIntegrationTestContext = {
  queue: {} as Queue.Queue<Log>
};

beforeEach(async () => {
  ctx.queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());
});

afterEach(async () => {
  await Runtime.runPromise(Runtime.defaultRuntime)(Queue.shutdown(ctx.queue));
});

test("gate with preflight ALLOW proceeds normally", async () => {
  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "read_data",
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(ctx.queue, log))
  );

  const preflight: PreflightSpec = {
    url: "https://docs.example.com/api",
    intent: "read user data safely",
    action: "read"
  };

  const gate = {
    name: "preflight-allow-test",
    preflight,
    observe: createTestObserveResource(ctx.queue),
    act: [Act.wait(200)],
    assert: [Assert.noErrors()],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("success");
});

test("gate without preflight works as before", async () => {
  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "normal_action",
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(ctx.queue, log))
  );

  const gate = {
    name: "no-preflight-test",
    observe: createTestObserveResource(ctx.queue),
    act: [Act.wait(200)],
    assert: [Assert.noErrors()],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("success");
});

test("gate with preflight and multiple actions", async () => {
  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "action_1",
      status: "success"
    },
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "action_2",
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(ctx.queue, log))
  );

  const preflight: PreflightSpec = {
    url: "https://docs.example.com/api",
    intent: "execute multi-step operation",
    action: "execute"
  };

  const gate = {
    name: "preflight-multi-action-test",
    preflight,
    observe: createTestObserveResource(ctx.queue),
    act: [
      Act.wait(100),
      Act.wait(100)
    ],
    assert: [
      Assert.hasAction("action_1"),
      Assert.hasAction("action_2")
    ],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("success");
  expect(result.evidence.actionsSeen).toContain("action_1");
  expect(result.evidence.actionsSeen).toContain("action_2");
});

test("gate with write action preflight", async () => {
  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "write_data",
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(ctx.queue, log))
  );

  const preflight: PreflightSpec = {
    url: "https://docs.example.com/write-api",
    intent: "write configuration data",
    action: "write"
  };

  const gate = {
    name: "preflight-write-test",
    preflight,
    observe: createTestObserveResource(ctx.queue),
    act: [Act.wait(200)],
    assert: [Assert.noErrors()],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  // Should succeed since mock implementation allows most operations
  expect(result.status).toBe("success");
});

test("gate with delete action preflight", async () => {
  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "delete_data",
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(ctx.queue, log))
  );

  const preflight: PreflightSpec = {
    url: "https://docs.example.com/delete-api",
    intent: "delete temporary data",
    action: "delete"
  };

  const gate = {
    name: "preflight-delete-test",
    preflight,
    observe: createTestObserveResource(ctx.queue),
    act: [Act.wait(200)],
    assert: [Assert.noErrors()],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  // Should succeed with mock implementation
  expect(result.status).toBe("success");
});
