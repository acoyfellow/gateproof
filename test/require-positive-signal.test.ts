import { test, expect, beforeAll, afterAll } from "bun:test";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { runPrd } from "../src/prd/runner";

const testDir = resolve(process.cwd(), "test/fixtures/require-positive-signal");

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });

  // Create a gate that returns success but no evidence
  writeFileSync(
    resolve(testDir, "no-evidence.gate.ts"),
    `export async function run() {
  return {
    status: "success",
    durationMs: 100,
    logs: [],
    evidence: {
      requestIds: [],
      stagesSeen: [],
      actionsSeen: [],
      errorTags: [],
    },
  };
}`
  );

  // Create a gate that returns success with evidence
  writeFileSync(
    resolve(testDir, "with-evidence.gate.ts"),
    `export async function run() {
  return {
    status: "success",
    durationMs: 100,
    logs: [{ action: "test_action", stage: "test_stage" }],
    evidence: {
      requestIds: [],
      stagesSeen: ["test_stage"],
      actionsSeen: ["test_action"],
      errorTags: [],
    },
  };
}`
  );
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

test("gate without requirePositiveSignal passes with no evidence", async () => {
  const prd = {
    stories: [
      {
        id: "no-evidence-ok",
        title: "No evidence is OK",
        gateFile: resolve(testDir, "no-evidence.gate.ts"),
        // requirePositiveSignal not set (default false)
      },
    ],
  };

  const result = await runPrd(prd, process.cwd());

  expect(result.success).toBe(true);
});

test("gate with requirePositiveSignal fails with no evidence", async () => {
  const prd = {
    stories: [
      {
        id: "needs-evidence",
        title: "Needs evidence",
        gateFile: resolve(testDir, "no-evidence.gate.ts"),
        requirePositiveSignal: true,
      },
    ],
  };

  const result = await runPrd(prd, process.cwd());

  expect(result.success).toBe(false);
  expect(result.failedStory?.id).toBe("needs-evidence");
  expect(result.error?.message).toContain("positive signal");
});

test("gate with requirePositiveSignal passes with evidence", async () => {
  const prd = {
    stories: [
      {
        id: "has-evidence",
        title: "Has evidence",
        gateFile: resolve(testDir, "with-evidence.gate.ts"),
        requirePositiveSignal: true,
      },
    ],
  };

  const result = await runPrd(prd, process.cwd());

  expect(result.success).toBe(true);
});

test("requirePositiveSignal error is in report", async () => {
  const prd = {
    stories: [
      {
        id: "needs-evidence",
        title: "Needs evidence",
        gateFile: resolve(testDir, "no-evidence.gate.ts"),
        requirePositiveSignal: true,
      },
    ],
  };

  const result = await runPrd(prd, process.cwd());

  expect(result.report).toBeDefined();
  expect(result.report?.success).toBe(false);

  const storyResult = result.report?.stories.find(s => s.id === "needs-evidence");
  expect(storyResult?.error?.name).toBe("NoPositiveSignal");
});
