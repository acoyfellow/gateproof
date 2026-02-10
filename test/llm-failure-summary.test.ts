import { test, expect } from "bun:test";
import {
  createLLMFailureSummary,
  formatLLMFailureSummary,
  type PrdReportV1,
} from "../src/report";

test("createLLMFailureSummary creates valid structure", () => {
  const report: PrdReportV1 = {
    version: "1",
    success: false,
    stories: [
      {
        id: "test-story",
        title: "Test Story",
        gateFile: "gates/test.gate.ts",
        status: "failed",
        durationMs: 1000,
        error: {
          name: "AssertionFailed",
          message: "HasAction: missing 'user_created'",
        },
      },
    ],
    failedStory: {
      id: "test-story",
      title: "Test Story",
      gateFile: "gates/test.gate.ts",
    },
    totalDurationMs: 1000,
  };

  const summary = createLLMFailureSummary(report);

  expect(summary.summary).toContain("test-story");
  expect(summary.failedAssertions).toHaveLength(1);
  expect(summary.suggestions).toBeInstanceOf(Array);
  expect(summary.evidence).toBeDefined();
});

test("createLLMFailureSummary parses HasAction assertion", () => {
  const report: PrdReportV1 = {
    version: "1",
    success: false,
    stories: [
      {
        id: "test-story",
        title: "Test Story",
        gateFile: "gates/test.gate.ts",
        status: "failed",
        durationMs: 1000,
        error: {
          name: "AssertionFailed",
          message: "HasAction: missing 'user_created'",
        },
      },
    ],
    failedStory: {
      id: "test-story",
      title: "Test Story",
      gateFile: "gates/test.gate.ts",
    },
    totalDurationMs: 1000,
  };

  const summary = createLLMFailureSummary(report);

  expect(summary.failedAssertions[0].name).toBe("HasAction");
  expect(summary.failedAssertions[0].message).toContain("user_created");
  expect(summary.suggestions.some(s => s.includes("user_created"))).toBe(true);
});

test("createLLMFailureSummary handles NoPositiveSignal", () => {
  const report: PrdReportV1 = {
    version: "1",
    success: false,
    stories: [
      {
        id: "test-story",
        title: "Test Story",
        gateFile: "gates/test.gate.ts",
        status: "failed",
        durationMs: 1000,
        error: {
          name: "NoPositiveSignal",
          message: "No actions or stages observed",
        },
      },
    ],
    failedStory: {
      id: "test-story",
      title: "Test Story",
      gateFile: "gates/test.gate.ts",
    },
    totalDurationMs: 1000,
  };

  const summary = createLLMFailureSummary(report);

  expect(summary.failedAssertions[0].name).toBe("NoPositiveSignal");
  expect(summary.suggestions.some(s => s.includes("logging"))).toBe(true);
});

test("createLLMFailureSummary handles ScopeViolation", () => {
  const report: PrdReportV1 = {
    version: "1",
    success: false,
    stories: [
      {
        id: "test-story",
        title: "Test Story",
        gateFile: "gates/test.gate.ts",
        status: "failed",
        durationMs: 1000,
        error: {
          tag: "ScopeViolation",
          name: "ScopeViolation",
          message: "Changed forbidden path: node_modules/",
        },
      },
    ],
    failedStory: {
      id: "test-story",
      title: "Test Story",
      gateFile: "gates/test.gate.ts",
    },
    totalDurationMs: 1000,
  };

  const summary = createLLMFailureSummary(report);

  expect(summary.failedAssertions[0].name).toBe("ScopeViolation");
  expect(summary.suggestions.some(s => s.includes("allowedPaths"))).toBe(true);
});

test("createLLMFailureSummary includes prdSlice from options", () => {
  const report: PrdReportV1 = {
    version: "1",
    success: false,
    stories: [],
    totalDurationMs: 1000,
  };

  const summary = createLLMFailureSummary(report, {
    prdSlice: {
      storyId: "custom-story",
      storyTitle: "Custom Story",
      gateFile: "custom.gate.ts",
      scope: { allowedPaths: ["src/"] },
    },
  });

  expect(summary.prdRelevantSlice?.storyId).toBe("custom-story");
  expect(summary.prdRelevantSlice?.scope?.allowedPaths).toContain("src/");
});

test("createLLMFailureSummary extracts evidence from logs", () => {
  const report: PrdReportV1 = {
    version: "1",
    success: false,
    stories: [],
    totalDurationMs: 1000,
  };

  const logs = [
    { action: "page_load", stage: "worker" },
    { action: "api_call", error: { tag: "ValidationError" } },
  ];

  const summary = createLLMFailureSummary(report, { logs });

  expect(summary.evidence.actionsSeen).toContain("page_load");
  expect(summary.evidence.actionsSeen).toContain("api_call");
  expect(summary.evidence.stagesSeen).toContain("worker");
  expect(summary.evidence.errorTags).toContain("ValidationError");
  expect(summary.evidence.logCount).toBe(2);
});

test("createLLMFailureSummary includes diffSnippet", () => {
  const report: PrdReportV1 = {
    version: "1",
    success: false,
    stories: [],
    totalDurationMs: 1000,
  };

  const summary = createLLMFailureSummary(report, {
    diffSnippet: "diff --git a/file.ts b/file.ts\n+added line",
  });

  expect(summary.diffSnippet).toContain("diff --git");
});

test("formatLLMFailureSummary returns formatted string", () => {
  const summary = createLLMFailureSummary({
    version: "1",
    success: false,
    stories: [
      {
        id: "test",
        title: "Test",
        gateFile: "test.gate.ts",
        status: "failed",
        durationMs: 1000,
        error: { name: "Error", message: "Something failed" },
      },
    ],
    failedStory: { id: "test", title: "Test", gateFile: "test.gate.ts" },
    totalDurationMs: 1000,
  });

  const formatted = formatLLMFailureSummary(summary);

  expect(formatted).toContain("=== GATEPROOF FAILURE SUMMARY");
  expect(formatted).toContain("Summary:");
  expect(formatted).toContain("Evidence:");
  expect(formatted).toContain("Suggestions:");
  expect(formatted).toContain("=== END FAILURE SUMMARY ===");
});

test("formatLLMFailureSummary includes PRD context", () => {
  const summary = createLLMFailureSummary({
    version: "1",
    success: false,
    stories: [],
    totalDurationMs: 1000,
  }, {
    prdSlice: {
      storyId: "my-story",
      storyTitle: "My Story Title",
      gateFile: "gates/my.gate.ts",
    },
  });

  const formatted = formatLLMFailureSummary(summary);

  expect(formatted).toContain("PRD Context:");
  expect(formatted).toContain("Story: my-story");
  expect(formatted).toContain("Title: My Story Title");
  expect(formatted).toContain("Gate: gates/my.gate.ts");
});
