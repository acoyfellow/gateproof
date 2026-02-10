import { test, expect } from "bun:test";
import {
  noErrors,
  hasAction,
  hasStage,
  hasAnyEvidence,
  hasMinLogs,
  hasLogWith,
  anyOf,
  not,
  allOf,
  browserAct,
  execAct,
  emptyObserve,
  gate,
  commandGate,
} from "../src/shorthands";

test("noErrors creates NoErrors assertion", () => {
  const assertion = noErrors();
  expect(assertion._tag).toBe("NoErrors");
});

test("hasAction creates HasAction assertion", () => {
  const assertion = hasAction("user_created");
  expect(assertion._tag).toBe("HasAction");
  expect((assertion as { action: string }).action).toBe("user_created");
});

test("hasStage creates HasStage assertion", () => {
  const assertion = hasStage("worker");
  expect(assertion._tag).toBe("HasStage");
  expect((assertion as { stage: string }).stage).toBe("worker");
});

test("hasAnyEvidence creates Custom assertion", () => {
  const assertion = hasAnyEvidence();
  expect(assertion._tag).toBe("Custom");
  expect((assertion as { name: string }).name).toBe("HasAnyEvidence");
});

test("hasAnyEvidence passes when logs have actions", async () => {
  const assertion = hasAnyEvidence();
  const logs = [{ action: "test_action" }];
  const result = await (assertion as { fn: (logs: any[]) => Promise<boolean> }).fn(logs);
  expect(result).toBe(true);
});

test("hasAnyEvidence passes when logs have stages", async () => {
  const assertion = hasAnyEvidence();
  const logs = [{ stage: "test_stage" }];
  const result = await (assertion as { fn: (logs: any[]) => Promise<boolean> }).fn(logs);
  expect(result).toBe(true);
});

test("hasAnyEvidence fails when logs are empty", async () => {
  const assertion = hasAnyEvidence();
  const logs: any[] = [];
  const result = await (assertion as { fn: (logs: any[]) => Promise<boolean> }).fn(logs);
  expect(result).toBe(false);
});

test("hasMinLogs passes when enough logs", async () => {
  const assertion = hasMinLogs(3);
  const logs = [{ a: 1 }, { b: 2 }, { c: 3 }];
  const result = await (assertion as { fn: (logs: any[]) => Promise<boolean> }).fn(logs);
  expect(result).toBe(true);
});

test("hasMinLogs fails when not enough logs", async () => {
  const assertion = hasMinLogs(3);
  const logs = [{ a: 1 }];
  const result = await (assertion as { fn: (logs: any[]) => Promise<boolean> }).fn(logs);
  expect(result).toBe(false);
});

test("hasLogWith passes when log has field", async () => {
  const assertion = hasLogWith("userId", "123");
  const logs = [{ userId: "123" }];
  const result = await (assertion as { fn: (logs: any[]) => Promise<boolean> }).fn(logs);
  expect(result).toBe(true);
});

test("hasLogWith fails when log missing field", async () => {
  const assertion = hasLogWith("userId", "123");
  const logs = [{ userId: "456" }];
  const result = await (assertion as { fn: (logs: any[]) => Promise<boolean> }).fn(logs);
  expect(result).toBe(false);
});

test("anyOf passes when any assertion passes", async () => {
  const assertion = anyOf(hasAction("a"), hasAction("b"));
  const logs = [{ action: "b" }];
  const result = await (assertion as { fn: (logs: any[]) => Promise<boolean> }).fn(logs);
  expect(result).toBe(true);
});

test("anyOf fails when no assertions pass", async () => {
  const assertion = anyOf(hasAction("a"), hasAction("b"));
  const logs = [{ action: "c" }];
  const result = await (assertion as { fn: (logs: any[]) => Promise<boolean> }).fn(logs);
  expect(result).toBe(false);
});

test("not negates an assertion", async () => {
  const assertion = not(hasAction("error"));
  const logs = [{ action: "success" }];
  const result = await (assertion as { fn: (logs: any[]) => Promise<boolean> }).fn(logs);
  expect(result).toBe(true);
});

test("allOf returns array of assertions", () => {
  const assertions = allOf(noErrors(), hasAction("a"), hasAction("b"));
  expect(assertions).toHaveLength(3);
});

test("browserAct.goto creates Browser action", () => {
  const action = browserAct.goto("https://example.com");
  expect(action._tag).toBe("Browser");
  expect((action as { url: string }).url).toBe("https://example.com");
});

test("browserAct.gotoVisible creates Browser action with headless: false", () => {
  const action = browserAct.gotoVisible("https://example.com");
  expect(action._tag).toBe("Browser");
  expect((action as { headless?: boolean }).headless).toBe(false);
});

test("execAct.run creates Exec action", () => {
  const action = execAct.run("npm test");
  expect(action._tag).toBe("Exec");
  expect((action as { command: string }).command).toBe("npm test");
});

test("execAct.npm creates npm run command", () => {
  const action = execAct.npm("test");
  expect(action._tag).toBe("Exec");
  expect((action as { command: string }).command).toBe("npm run test");
});

test("execAct.bun creates bun run command", () => {
  const action = execAct.bun("test");
  expect(action._tag).toBe("Exec");
  expect((action as { command: string }).command).toBe("bun run test");
});

test("emptyObserve returns empty observe resource", () => {
  const observe = emptyObserve();
  expect(observe).toBeDefined();
  expect(typeof observe.start).toBe("function");
  expect(typeof observe.stop).toBe("function");
});

test("gate runs with empty observe by default", async () => {
  const result = await gate("test-gate", {
    act: [],
    assert: [],
  });

  expect(result).toBeDefined();
  expect(result.status).toBe("success");
});

test("commandGate runs a command and returns result", async () => {
  const result = await commandGate("echo-test", "echo hello");
  expect(result).toBeDefined();
  expect(result.status).toBe("success");
});
