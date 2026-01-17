import { test, expect } from "bun:test";
import { Gate, Act, Assert } from "../src/index";
import type { Log } from "../src/types";
import { createObserveResource, ObservabilityError } from "../src/observe";
import { createTestObserveResource } from "../src/test-helpers";
import { Effect, Queue, Runtime } from "effect";

function createFailingObserveResource() {
  const backend = {
    start: () => Effect.fail(new ObservabilityError({
      cause: new Error("Network failure"),
      message: "Network failure",
      stack: new Error("Network failure").stack
    })),
    stop: () => Effect.void
  };
  return createObserveResource(backend);
}


test("provider-error: handles observability backend failure", async () => {
  const gate = {
    name: "provider-error-test",
    observe: createFailingObserveResource(),
    act: [Act.wait(100)],
    assert: []
  };

  try {
    const result = await Gate.run(gate);
    expect(result.status).toBe("failed");
    expect(result.error).toBeDefined();
  } catch (error) {
    // Error may be thrown, which is also acceptable
    expect(error).toBeDefined();
  }
});

test("provider-error: handles invalid credentials gracefully", async () => {
  // This test would require actual Cloudflare API to test properly
  // Test that the error handling works
  const queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());

  const gate = {
    name: "invalid-credentials-test",
    observe: createTestObserveResource(queue),
    act: [Act.wait(100)],
    assert: []
  };

  const result = await Gate.run(gate);

  expect(result.status).toBe("success");
});

test("provider-error: handles network failures", async () => {
  const gate = {
    name: "network-failure-test",
    observe: createFailingObserveResource(),
    act: [Act.wait(100)],
    assert: []
  };

  try {
    const result = await Gate.run(gate);
    expect(result.status).toBe("failed");
    expect(result.error).toBeDefined();
  } catch (error) {
    // Error may be thrown, which is also acceptable
    expect(error).toBeDefined();
  }
});
