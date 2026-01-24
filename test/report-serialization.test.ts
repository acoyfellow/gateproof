import { test, expect } from "bun:test";
import { Gate, Act } from "../src/index";
import { createTestObserveResource } from "../src/test-helpers";
import { Effect, Queue, Runtime } from "effect";
import type { Log } from "../src/types";
import { toGateResultV1, serializeError } from "../src/report";
import type { GateResultV1 } from "../src/report";

test("report: error serialization produces valid JSON", () => {
  const error = new Error("Test error");
  const serialized = serializeError(error);
  
  expect(serialized).toHaveProperty("name");
  expect(serialized).toHaveProperty("message");
  expect(serialized.name).toBe("Error");
  expect(serialized.message).toBe("Test error");
  
  const json = JSON.stringify(serialized);
  const parsed = JSON.parse(json);
  expect(parsed.name).toBe("Error");
  expect(parsed.message).toBe("Test error");
});

test("report: preserves Effect-tagged errors", () => {
  const error = new Error("Tagged error") as Error & { _tag?: string };
  error._tag = "CustomTag";
  
  const serialized = serializeError(error);
  expect(serialized.tag).toBe("CustomTag");
  expect(serialized.name).toBe("Error");
  expect(serialized.message).toBe("Tagged error");
});

test("report: GateResultV1 is fully serializable", async () => {
  const queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());
  
  const gate = {
    name: "serialization-test",
    observe: createTestObserveResource(queue),
    act: [Act.wait(10)],
    assert: [],
    report: "json" as const,
  };
  
  const result = await Gate.run(gate);
  const v1 = toGateResultV1(result);
  
  const json = JSON.stringify(v1);
  const parsed = JSON.parse(json) as GateResultV1;
  
  expect(parsed.version).toBe("1");
  expect(parsed.status).toBe(result.status);
  expect(parsed.durationMs).toBe(result.durationMs);
  expect(Array.isArray(parsed.logs)).toBe(true);
  expect(parsed.evidence).toBeDefined();
  expect(Array.isArray(parsed.evidence.requestIds)).toBe(true);
  expect(Array.isArray(parsed.evidence.stagesSeen)).toBe(true);
  expect(Array.isArray(parsed.evidence.actionsSeen)).toBe(true);
  expect(Array.isArray(parsed.evidence.errorTags)).toBe(true);
  
  if (parsed.error) {
    expect(typeof parsed.error.name).toBe("string");
    expect(typeof parsed.error.message).toBe("string");
    expect(parsed.error.stack === undefined || typeof parsed.error.stack === "string").toBe(true);
  }
});

test("report: deterministic sorting in evidence", async () => {
  const queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());
  
  const logs: Log[] = [
    { stage: "zebra", action: "action3" },
    { stage: "alpha", action: "action1" },
    { stage: "beta", action: "action2" },
  ];
  
  for (const log of logs) {
    await Runtime.runPromise(Runtime.defaultRuntime)(Queue.offer(queue, log));
  }
  
  const gate = {
    name: "deterministic-test",
    observe: createTestObserveResource(queue),
    act: [Act.wait(10)],
    assert: [],
    report: "json" as const,
  };
  
  const result = await Gate.run(gate);
  const v1 = toGateResultV1(result);
  
  expect(v1.evidence.stagesSeen).toEqual(["alpha", "beta", "zebra"]);
  expect(v1.evidence.actionsSeen).toEqual(["action1", "action2", "action3"]);
});

test("report: failed gate includes serialized error", async () => {
  const queue = await Runtime.runPromise(Runtime.defaultRuntime)(Queue.unbounded<Log>());
  
  const gate = {
    name: "error-serialization-test",
    observe: createTestObserveResource(queue),
    act: [Act.exec("exit 1")],
    assert: [],
    report: "json" as const,
  };
  
  const result = await Gate.run(gate);
  expect(result.status).toBe("failed");
  expect(result.error).toBeDefined();
  
  const v1 = toGateResultV1(result);
  expect(v1.error).toBeDefined();
  expect(v1.error?.name).toBeDefined();
  expect(v1.error?.message).toBeDefined();
  
  const json = JSON.stringify(v1);
  const parsed = JSON.parse(json);
  expect(parsed.error).toBeDefined();
  expect(typeof parsed.error.name).toBe("string");
  expect(typeof parsed.error.message).toBe("string");
});
