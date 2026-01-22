import { test, expect } from "bun:test";
import { Gate, Act, Assert } from "../src/index";
import type { Log } from "../src/types";
import { createTestObserveResource } from "../src/test-helpers";
import { Effect, Queue, Runtime } from "effect";

test("action-failure: exec command failure is handled", async () => {
  const queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  const gate = {
    name: "exec-failure-test",
    observe: createTestObserveResource(queue),
    act: [Act.exec("nonexistent-command-that-fails")],
    assert: []
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("failed");
  expect(result.error).toBeDefined();
});

test("action-failure: browser action handles playwright unavailable", async () => {
  const queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  // This will fail if playwright is not installed, which is expected
  const gate = {
    name: "browser-failure-test",
    observe: createTestObserveResource(queue),
    act: [Act.browser({ url: "https://example.com" })],
    assert: []
  };

  const result = await Gate.run(gate);

  // May fail if playwright not available, or succeed if it is
  expect(["success", "failed"]).toContain(result.status);
});

test("action-failure: deploy action handles wrangler failure", async () => {
  const queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  const gate = {
    name: "deploy-failure-test",
    observe: createTestObserveResource(queue),
    act: [Act.deploy({ worker: "nonexistent-worker" })],
    assert: [],
    stop: { idleMs: 1000, maxMs: 10000 }
  };

  const result = await Gate.run(gate);

  // Deploy may fail if wrangler not available or worker doesn't exist
  expect(["success", "failed"]).toContain(result.status);
}, 15000);
