#!/usr/bin/env bun
/**
 * Gate: Search Tool
 *
 * Verifies: src/tools/search.ts finds patterns in code using ripgrep.
 *
 * The tool should:
 * - Accept: pattern, path as arguments
 * - Use ripgrep to search
 * - Output matching lines with file:line format
 * - Exit 0 if matches found, 1 if no matches, other on error
 */

import { Gate, Assert } from "../../../src/index";
import { createEmptyObserveResource } from "../../../src/utils";
import { mkdir, rm } from "node:fs/promises";

export async function run() {
  const testDir = `${import.meta.dir}/../.test-artifacts/search-test`;

  // Setup: create files with known patterns
  await rm(`${import.meta.dir}/../.test-artifacts`, { recursive: true, force: true });
  await mkdir(testDir, { recursive: true });
  await Bun.write(`${testDir}/file1.ts`, "function hello() { return 'world'; }");
  await Bun.write(`${testDir}/file2.ts`, "const goodbye = 'farewell';");
  await Bun.write(`${testDir}/file3.txt`, "no match here");

  const result = await Gate.run({
    name: "search-tool",
    observe: createEmptyObserveResource(),
    act: [],
    assert: [
      // Verify: tool exists
      Assert.custom("tool_exists", async () => {
        const toolPath = `${import.meta.dir}/../src/tools/search.ts`;
        return await Bun.file(toolPath).exists();
      }),

      // Verify: tool finds pattern
      Assert.custom("finds_pattern", async () => {
        const toolPath = `${import.meta.dir}/../src/tools/search.ts`;
        const proc = Bun.spawn(["bun", "run", toolPath, "hello", testDir]);
        const output = await new Response(proc.stdout).text();
        await proc.exited;

        return proc.exitCode === 0 && output.includes("file1.ts") && output.includes("hello");
      }),

      // Verify: tool returns exit 1 when no matches
      Assert.custom("no_match_exit_1", async () => {
        const toolPath = `${import.meta.dir}/../src/tools/search.ts`;
        const proc = Bun.spawn(["bun", "run", toolPath, "NOMATCHPATTERN", testDir]);
        await proc.exited;
        return proc.exitCode === 1;
      }),

      // Verify: tool searches recursively
      Assert.custom("searches_recursively", async () => {
        // Create nested file
        await mkdir(`${testDir}/nested`, { recursive: true });
        await Bun.write(`${testDir}/nested/deep.ts`, "const findme = true;");

        const toolPath = `${import.meta.dir}/../src/tools/search.ts`;
        const proc = Bun.spawn(["bun", "run", toolPath, "findme", testDir]);
        const output = await new Response(proc.stdout).text();
        await proc.exited;

        return proc.exitCode === 0 && output.includes("deep.ts");
      }),
    ],
    stop: { idleMs: 1000, maxMs: 30000 },
  });

  // Cleanup
  await rm(`${import.meta.dir}/../.test-artifacts`, { recursive: true, force: true });

  return { status: result.status };
}
