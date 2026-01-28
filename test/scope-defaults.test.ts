import { test, expect } from "bun:test";
import {
  inferScopeDefaults,
  DEFAULT_FORBIDDEN_PATHS,
  COMMON_SRC_PATTERNS,
  applyDefaultScope,
} from "../src/prd/scope-defaults";

test("DEFAULT_FORBIDDEN_PATHS includes node_modules", () => {
  expect(DEFAULT_FORBIDDEN_PATHS).toContain("node_modules/");
});

test("DEFAULT_FORBIDDEN_PATHS includes .git", () => {
  expect(DEFAULT_FORBIDDEN_PATHS).toContain(".git/");
});

test("DEFAULT_FORBIDDEN_PATHS includes dist", () => {
  expect(DEFAULT_FORBIDDEN_PATHS).toContain("dist/");
});

test("DEFAULT_FORBIDDEN_PATHS includes lock files", () => {
  expect(DEFAULT_FORBIDDEN_PATHS).toContain("package-lock.json");
  expect(DEFAULT_FORBIDDEN_PATHS).toContain("yarn.lock");
  expect(DEFAULT_FORBIDDEN_PATHS).toContain("bun.lockb");
});

test("COMMON_SRC_PATTERNS includes src/", () => {
  expect(COMMON_SRC_PATTERNS).toContain("src/");
});

test("COMMON_SRC_PATTERNS includes app/", () => {
  expect(COMMON_SRC_PATTERNS).toContain("app/");
});

test("COMMON_SRC_PATTERNS includes lib/", () => {
  expect(COMMON_SRC_PATTERNS).toContain("lib/");
});

test("inferScopeDefaults returns valid structure", () => {
  const defaults = inferScopeDefaults(process.cwd());

  expect(defaults).toBeDefined();
  expect(Array.isArray(defaults.allowedPaths)).toBe(true);
  expect(Array.isArray(defaults.forbiddenPaths)).toBe(true);
  expect(typeof defaults.isMonorepo).toBe("boolean");
  expect(Array.isArray(defaults.workspaces)).toBe(true);
});

test("inferScopeDefaults includes forbiddenPaths from defaults", () => {
  const defaults = inferScopeDefaults(process.cwd());

  expect(defaults.forbiddenPaths).toContain("node_modules/");
  expect(defaults.forbiddenPaths).toContain(".git/");
});

test("inferScopeDefaults detects src/ directory in gateproof", () => {
  const defaults = inferScopeDefaults(process.cwd());

  // gateproof has src/ directory
  expect(defaults.allowedPaths).toContain("src/");
});

test("applyDefaultScope adds defaults when scope is missing", () => {
  const story = { id: "test" };
  const defaults = inferScopeDefaults(process.cwd());

  const result = applyDefaultScope(story, defaults);

  expect(result.scope).toBeDefined();
  expect(result.scope.allowedPaths).toEqual(defaults.allowedPaths);
  expect(result.scope.forbiddenPaths).toEqual(defaults.forbiddenPaths);
});

test("applyDefaultScope preserves existing scope", () => {
  const story = {
    id: "test",
    scope: {
      allowedPaths: ["custom/"],
      forbiddenPaths: ["forbidden/"],
    },
  };
  const defaults = inferScopeDefaults(process.cwd());

  const result = applyDefaultScope(story, defaults);

  expect(result.scope.allowedPaths).toEqual(["custom/"]);
  expect(result.scope.forbiddenPaths).toEqual(["forbidden/"]);
});

test("applyDefaultScope fills in missing parts of scope", () => {
  const story = {
    id: "test",
    scope: {
      allowedPaths: ["custom/"],
      // forbiddenPaths not specified
    },
  };
  const defaults = inferScopeDefaults(process.cwd());

  const result = applyDefaultScope(story, defaults);

  expect(result.scope.allowedPaths).toEqual(["custom/"]);
  expect(result.scope.forbiddenPaths).toEqual(defaults.forbiddenPaths);
});
