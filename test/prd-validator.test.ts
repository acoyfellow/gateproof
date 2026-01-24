import { test, expect } from "bun:test";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("prd-validate: rejects scope with contradictory paths", async () => {
  const testDir = join(tmpdir(), `gateproof-validator-test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
  
  const prdPath = join(testDir, "prd.ts");
  writeFileSync(
    prdPath,
    `export const prd = {
      stories: [
        {
          id: "test-story",
          title: "Test Story",
          gateFile: "./test.gate.ts",
          scope: {
            allowedPaths: ["src/index.ts"],
            forbiddenPaths: ["src/index.ts"],
          },
        },
      ],
    };`
  );
  
  const gatesDir = join(testDir, "gates");
  mkdirSync(gatesDir, { recursive: true });
  writeFileSync(
    join(gatesDir, "test.gate.ts"),
    `export async function run() { return { status: "success" }; }`
  );
  
  const result = spawnSync("bun", ["run", "scripts/prd-validate.ts", prdPath], {
    cwd: testDir,
    encoding: "utf-8",
  });
  
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("scope contradiction");
  
  rmSync(testDir, { recursive: true, force: true });
});

test("prd-validate: accepts valid scope", async () => {
  const testDir = join(tmpdir(), `gateproof-validator-test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
  
  const prdPath = join(testDir, "prd.ts");
  writeFileSync(
    prdPath,
    `export const prd = {
      stories: [
        {
          id: "test-story",
          title: "Test Story",
          gateFile: "./test.gate.ts",
          scope: {
            allowedPaths: ["src/**"],
            maxChangedFiles: 10,
            maxChangedLines: 100,
          },
        },
      ],
    };`
  );
  
  const gatesDir = join(testDir, "gates");
  mkdirSync(gatesDir, { recursive: true });
  writeFileSync(
    join(gatesDir, "test.gate.ts"),
    `export async function run() { return { status: "success" }; }`
  );
  
  const result = spawnSync("bun", ["run", "scripts/prd-validate.ts", prdPath], {
    cwd: testDir,
    encoding: "utf-8",
  });
  
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("PRD validated");
  
  rmSync(testDir, { recursive: true, force: true });
});

test("prd-validate: rejects invalid scope.maxChangedFiles", async () => {
  const testDir = join(tmpdir(), `gateproof-validator-test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
  
  const prdPath = join(testDir, "prd.ts");
  writeFileSync(
    prdPath,
    `export const prd = {
      stories: [
        {
          id: "test-story",
          title: "Test Story",
          gateFile: "./test.gate.ts",
          scope: {
            maxChangedFiles: -1,
          },
        },
      ],
    };`
  );
  
  const gatesDir = join(testDir, "gates");
  mkdirSync(gatesDir, { recursive: true });
  writeFileSync(
    join(gatesDir, "test.gate.ts"),
    `export async function run() { return { status: "success" }; }`
  );
  
  const result = spawnSync("bun", ["run", "scripts/prd-validate.ts", prdPath], {
    cwd: testDir,
    encoding: "utf-8",
  });
  
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("maxChangedFiles");
  
  rmSync(testDir, { recursive: true, force: true });
});
