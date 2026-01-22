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


test("integration: successful gate with wait action collects logs", () =>
  withQueue(async (queue) => {
  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "request_received",
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "integration-test-1",
    observe: createTestObserveResource(queue),
    act: [Act.wait(200)],
    assert: [Assert.noErrors(), Assert.hasAction("request_received")],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("success");
  expect(result.logs.length).toBeGreaterThan(0);
  expect(result.evidence.actionsSeen).toContain("request_received");
  expect(result.evidence.errorTags).toHaveLength(0);
  })
);

test("integration: gate with sequence of actions processes in order", () =>
  withQueue(async (queue) => {
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
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "integration-sequence-test",
    observe: createTestObserveResource(queue),
    act: [
      Act.wait(100),
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
  })
);

test("integration: gate fails when assertion is not met", () =>
  withQueue(async (queue) => {
  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "some_action",
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "integration-fail-test",
    observe: createTestObserveResource(queue),
    act: [Act.wait(100)],
    assert: [Assert.hasAction("nonexistent_action")],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("failed");
  expect(result.error).toBeDefined();
  })
);

test("integration: gate detects errors in logs", () =>
  withQueue(async (queue) => {
  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      status: "error",
      error: { tag: "TestError", message: "Test error message" }
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "integration-error-test",
    observe: createTestObserveResource(queue),
    act: [Act.wait(100)],
    assert: [Assert.noErrors()],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("failed");
  expect(result.evidence.errorTags).toContain("TestError");
  })
);

test("integration: gate with custom assertion evaluates custom logic", () =>
  withQueue(async (queue) => {
  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "handle_request",
      durationMs: 100,
      status: "success"
    },
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "handle_request",
      durationMs: 1000,
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "integration-custom-test",
    observe: createTestObserveResource(queue),
    act: [Act.wait(100)],
    assert: [
      Assert.custom("avg_duration_ok", (logs: Log[]) => {
        const requestLogs = logs.filter(log => log.action === "handle_request" && log.durationMs !== undefined);
        if (requestLogs.length === 0) return false;
        const avgDuration = requestLogs.reduce((sum, log) => sum + (log.durationMs || 0), 0) / requestLogs.length;
        return avgDuration < 600;
      })
    ],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("success");
  })
);

test("integration: gate executes shell commands via exec action", () =>
  withQueue(async (queue) => {
  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "deploy_complete",
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "integration-exec-test",
    observe: createTestObserveResource(queue),
    act: [
      Act.exec("echo test"),
      Act.wait(100)
    ],
    assert: [Assert.noErrors()],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("success");
  })
);

test("integration: gate fails when exec command returns non-zero exit code", () =>
  withQueue(async (queue) => {
  const logs: Log[] = [];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "integration-exec-fail-test",
    observe: createTestObserveResource(queue),
    act: [
      Act.exec("exit 1"),
      Act.wait(100)
    ],
    assert: [Assert.noErrors()],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("failed");
  expect(result.error).toBeDefined();
  })
);

test("integration: gate with multiple assertions validates all conditions", () =>
  withQueue(async (queue) => {
  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "worker_action",
      status: "success"
    },
    {
      timestamp: new Date().toISOString(),
      stage: "durable_object",
      action: "do_action",
      status: "success"
    },
    {
      timestamp: new Date().toISOString(),
      stage: "container",
      action: "container_action",
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "integration-multi-assert-test",
    observe: createTestObserveResource(queue),
    act: [Act.wait(100)],
    assert: [
      Assert.noErrors(),
      Assert.hasAction("worker_action"),
      Assert.hasAction("do_action"),
      Assert.hasAction("container_action"),
      Assert.hasStage("worker"),
      Assert.hasStage("durable_object"),
      Assert.hasStage("container")
    ],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("success");
  expect(result.evidence.stagesSeen).toContain("worker");
  expect(result.evidence.stagesSeen).toContain("durable_object");
  expect(result.evidence.stagesSeen).toContain("container");
  })
);

test("integration: gate outputs structured JSON report", () =>
  withQueue(async (queue) => {
  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "test_action",
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "integration-json-report-test",
    observe: createTestObserveResource(queue),
    act: [Act.wait(100)],
    assert: [Assert.noErrors()],
    stop: { idleMs: 1000, maxMs: 5000 },
    report: "json" as const
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("success");
  expect(result.evidence).toBeDefined();
  expect(result.logs).toBeDefined();
  expect(result.durationMs).toBeGreaterThan(0);
  })
);

test("integration: gate completes with no logs on idle timeout", () =>
  withQueue(async (queue) => {
  const logs: Log[] = [];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "integration-idle-no-logs-test",
    observe: createTestObserveResource(queue),
    act: [Act.wait(100)],
    assert: [Assert.noErrors()],
    stop: { idleMs: 500, maxMs: 10000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("success");
  expect(result.logs.length).toBe(0);
  })
);

test("integration: gate completes when idle timeout reached", () =>
  withQueue(async (queue) => {
  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "test_action",
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "integration-idle-test",
    observe: createTestObserveResource(queue),
    act: [Act.wait(100)],
    assert: [Assert.noErrors()],
    stop: { idleMs: 500, maxMs: 10000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("success");
  expect(result.durationMs).toBeGreaterThan(0);
  })
);

test("integration: gate collects multiple requestIds from logs", () =>
  withQueue(async (queue) => {
  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      requestId: "req-1",
      stage: "worker",
      action: "handle_request",
      status: "success"
    },
    {
      timestamp: new Date().toISOString(),
      requestId: "req-2",
      stage: "worker",
      action: "handle_request",
      status: "success"
    },
    {
      timestamp: new Date().toISOString(),
      requestId: "req-3",
      stage: "worker",
      action: "handle_request",
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "integration-request-id-test",
    observe: createTestObserveResource(queue),
    act: [Act.wait(100)],
    assert: [
      Assert.noErrors(),
      Assert.custom("has_multiple_requests", (logs: Log[]) => {
        const requestIds = new Set(logs.filter(l => l.requestId).map(l => l.requestId!));
        return requestIds.size === 3;
      })
    ],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("success");
  expect(result.evidence.requestIds).toHaveLength(3);
  expect(result.evidence.requestIds).toContain("req-1");
  expect(result.evidence.requestIds).toContain("req-2");
  expect(result.evidence.requestIds).toContain("req-3");
  })
);

test("integration: gate respects custom data in logs", () =>
  withQueue(async (queue) => {
  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "test_action",
      status: "success",
      data: {
        customField: "customValue",
        customNumber: 42
      }
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "integration-custom-data-test",
    observe: createTestObserveResource(queue),
    act: [Act.wait(100)],
    assert: [
      Assert.noErrors(),
      Assert.custom("has_custom_data", (logs: Log[]) => {
        const log = logs[0];
        if (!log.data) return false;
        return log.data.customField === "customValue" && log.data.customNumber === 42;
      })
    ],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("success");
  expect(result.logs[0].data).toBeDefined();
  expect(result.logs[0].data?.customField).toBe("customValue");
  })
);

test("integration: gate handles multiple error tags correctly", () =>
  withQueue(async (queue) => {
  const logs: Log[] = [
      {
        timestamp: new Date().toISOString(),
        stage: "worker",
        status: "error",
        error: { tag: "ErrorType1", message: "First error" }
      },
      {
        timestamp: new Date().toISOString(),
        stage: "durable_object",
        status: "error",
        error: { tag: "ErrorType2", message: "Second error" }
      },
    {
      timestamp: new Date().toISOString(),
      stage: "worker",
      status: "success"
    }
  ];

  await Runtime.runPromise(Runtime.defaultRuntime)(
    Effect.forEach(logs, (log) => Queue.offer(queue, log))
  );

  const gate = {
    name: "integration-multi-error-test",
    observe: createTestObserveResource(queue),
    act: [Act.wait(100)],
    assert: [Assert.noErrors()],
    stop: { idleMs: 1000, maxMs: 5000 }
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("failed");
  expect(result.evidence.errorTags).toContain("ErrorType1");
  expect(result.evidence.errorTags).toContain("ErrorType2");
  })
);
