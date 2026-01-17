import { test, expect } from "bun:test";
import { Gate, Act } from "../src/index";
import { createTestObserveResource } from "../src/test-helpers";
import { Effect, Queue, Runtime } from "effect";
import type { Log } from "../src/types";

test("validation: rejects invalid worker name in deploy", async () => {
  const queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  const gate = {
    name: "validation-deploy-test",
    observe: createTestObserveResource(queue),
    act: [Act.deploy({ worker: "invalid worker name!" })],
    assert: []
  };

  const result = await Gate.run(gate);
  expect(result.status).toBe("failed");
  expect(result.error).toBeDefined();
});

test("validation: rejects invalid URL in browser", async () => {
  const queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  const gate = {
    name: "validation-browser-test",
    observe: createTestObserveResource(queue),
    act: [Act.browser({ url: "not-a-url" })],
    assert: []
  };

  const result = await Gate.run(gate);
  expect(result.status).toBe("failed");
  expect(result.error).toBeDefined();
});

test("validation: rejects dangerous command in exec", async () => {
  const queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  const gate = {
    name: "validation-exec-test",
    observe: createTestObserveResource(queue),
    act: [Act.exec("rm -rf /; echo hacked")],
    assert: []
  };

  const result = await Gate.run(gate);
  expect(result.status).toBe("failed");
  expect(result.error).toBeDefined();
});

test("validation: rejects negative wait time", async () => {
  const queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  const gate = {
    name: "validation-wait-test",
    observe: createTestObserveResource(queue),
    act: [Act.wait(-100)],
    assert: []
  };

  const result = await Gate.run(gate);
  expect(result.status).toBe("failed");
  expect(result.error).toBeDefined();
});

test("validation: rejects wait time over 1 hour", async () => {
  const queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  const gate = {
    name: "validation-wait-max-test",
    observe: createTestObserveResource(queue),
    act: [Act.wait(3600001)],
    assert: []
  };

  const result = await Gate.run(gate);
  expect(result.status).toBe("failed");
  expect(result.error).toBeDefined();
});
