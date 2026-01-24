import { test, expect } from "bun:test";
import { validateScope, getDiffStats, type ScopeViolation } from "../src/prd/scope-check";
import type { Story } from "../src/prd/types";

test("scope: validates maxChangedFiles", () => {
  const story: Story = {
    id: "test-story",
    title: "Test Story",
    gateFile: "./test.gate.ts",
    scope: {
      maxChangedFiles: 2,
    },
  };
  
  const diffStats = {
    changedFiles: ["file1.ts", "file2.ts", "file3.ts"],
    totalLines: 10,
  };
  
  const violations = validateScope(story, diffStats);
  expect(violations.length).toBe(1);
  expect(violations[0].details.violation).toBe("max_files_exceeded");
  expect(violations[0].details.actualFiles).toBe(3);
  expect(violations[0].details.maxFiles).toBe(2);
});

test("scope: validates maxChangedLines", () => {
  const story: Story = {
    id: "test-story",
    title: "Test Story",
    gateFile: "./test.gate.ts",
    scope: {
      maxChangedLines: 50,
    },
  };
  
  const diffStats = {
    changedFiles: ["file1.ts"],
    totalLines: 100,
  };
  
  const violations = validateScope(story, diffStats);
  expect(violations.length).toBe(1);
  expect(violations[0].details.violation).toBe("max_lines_exceeded");
  expect(violations[0].details.actualLines).toBe(100);
  expect(violations[0].details.maxLines).toBe(50);
});

test("scope: validates forbiddenPaths", () => {
  const story: Story = {
    id: "test-story",
    title: "Test Story",
    gateFile: "./test.gate.ts",
    scope: {
      forbiddenPaths: ["package.json", "tsconfig.json"],
    },
  };
  
  const diffStats = {
    changedFiles: ["src/index.ts", "package.json", "src/utils.ts"],
    totalLines: 10,
  };
  
  const violations = validateScope(story, diffStats);
  expect(violations.length).toBe(1);
  expect(violations[0].details.violation).toBe("forbidden_path");
  expect(violations[0].details.path).toBe("package.json");
});

test("scope: validates allowedPaths", () => {
  const story: Story = {
    id: "test-story",
    title: "Test Story",
    gateFile: "./test.gate.ts",
    scope: {
      allowedPaths: ["src/**"],
    },
  };
  
  const diffStats = {
    changedFiles: ["src/index.ts", "package.json"],
    totalLines: 10,
  };
  
  const violations = validateScope(story, diffStats);
  expect(violations.length).toBe(1);
  expect(violations[0].details.violation).toBe("forbidden_path");
  expect(violations[0].details.path).toBe("package.json");
});

test("scope: validates default forbidden paths", () => {
  const story: Story = {
    id: "test-story",
    title: "Test Story",
    gateFile: "./test.gate.ts",
    scope: {},
  };
  
  const diffStats = {
    changedFiles: [".github/workflows/ci.yml"],
    totalLines: 5,
  };
  
  const defaultForbidden = [".github/workflows/**"];
  const violations = validateScope(story, diffStats, defaultForbidden);
  expect(violations.length).toBe(1);
  expect(violations[0].details.violation).toBe("default_forbidden");
  expect(violations[0].details.path).toBe(".github/workflows/ci.yml");
});

test("scope: allows default forbidden if explicitly allowed", () => {
  const story: Story = {
    id: "test-story",
    title: "Test Story",
    gateFile: "./test.gate.ts",
    scope: {
      allowedPaths: [".github/workflows/**"],
    },
  };
  
  const diffStats = {
    changedFiles: [".github/workflows/ci.yml"],
    totalLines: 5,
  };
  
  const defaultForbidden = [".github/workflows/**"];
  const violations = validateScope(story, diffStats, defaultForbidden);
  expect(violations.length).toBe(0);
});

test("scope: no violations when constraints are met", () => {
  const story: Story = {
    id: "test-story",
    title: "Test Story",
    gateFile: "./test.gate.ts",
    scope: {
      allowedPaths: ["src/**"],
      maxChangedFiles: 5,
      maxChangedLines: 100,
    },
  };
  
  const diffStats = {
    changedFiles: ["src/index.ts", "src/utils.ts"],
    totalLines: 50,
  };
  
  const violations = validateScope(story, diffStats);
  expect(violations.length).toBe(0);
});
