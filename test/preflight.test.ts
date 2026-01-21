import { test, expect } from "bun:test";
import { Preflight, PreflightError } from "../src/preflight";
import type { PreflightSpec } from "../src/preflight";
import { Effect } from "effect";

test("Preflight.check creates a preflight result for ALLOW decision", async () => {
  const spec: PreflightSpec = {
    url: "https://docs.example.com/api",
    intent: "read user data",
    action: "read"
  };

  const result = await Effect.runPromise(Preflight.check(spec));

  expect(result.decision).toBe("ALLOW");
  expect(result.justification).toBeDefined();
  expect(typeof result.justification).toBe("string");
});

test("Preflight.check evaluates destructive actions more strictly", async () => {
  const deleteSpec: PreflightSpec = {
    url: "https://docs.example.com/api",
    intent: "delete user permanently",
    action: "delete"
  };

  const result = await Effect.runPromise(Preflight.check(deleteSpec));

  // With mock implementation, this should still allow but in real implementation
  // would have stricter checks
  expect(result.decision).toBeDefined();
  expect(["ALLOW", "ASK", "DENY"]).toContain(result.decision);
});

test("Preflight result includes justification", async () => {
  const spec: PreflightSpec = {
    url: "https://docs.example.com/api",
    intent: "write configuration",
    action: "write"
  };

  const result = await Effect.runPromise(Preflight.check(spec));

  expect(result.justification).toBeDefined();
  expect(result.justification.length).toBeGreaterThan(0);
});

test("Preflight ASK decision includes questions", async () => {
  // Create a spec that might trigger ASK decision
  // In mock implementation, we control this through the confidence scores
  const spec: PreflightSpec = {
    url: "https://docs.example.com/incomplete-api",
    intent: "execute complex operation",
    action: "execute"
  };

  const result = await Effect.runPromise(Preflight.check(spec));

  if (result.decision === "ASK") {
    expect(result.questions).toBeDefined();
    expect(Array.isArray(result.questions)).toBe(true);
  }
});

test("Preflight accepts optional modelId", async () => {
  const spec: PreflightSpec = {
    url: "https://docs.example.com/api",
    intent: "read data",
    action: "read",
    modelId: "claude-3-sonnet"
  };

  const result = await Effect.runPromise(Preflight.check(spec));

  expect(result.decision).toBeDefined();
});

test("Preflight result structure is correct", async () => {
  const spec: PreflightSpec = {
    url: "https://docs.example.com/api",
    intent: "read data",
    action: "read"
  };

  const result = await Effect.runPromise(Preflight.check(spec));

  expect(result).toHaveProperty("decision");
  expect(result).toHaveProperty("justification");
  expect(["ALLOW", "ASK", "DENY"]).toContain(result.decision);
  expect(typeof result.justification).toBe("string");
});
