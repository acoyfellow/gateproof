#!/usr/bin/env bun
/**
 * Gate: Read Tool
 *
 * Verifies: src/tools/read.ts can load file contents accurately.
 *
 * The tool should:
 * - Accept a file path as argument
 * - Output the file contents to stdout
 * - Exit 0 on success, non-zero on failure
 */

import { Gate, Act, Assert } from "../../../src/index";
import { createEmptyObserveResource } from "../../../src/utils";
import { mkdir, rm } from "node:fs/promises";

export async function run() {
  const testDir = `${import.meta.dir}/../.test-artifacts`;
  const testFile = `${testDir}/read-test.txt`;
  const expectedContent = "Hello from gateproof!\nLine 2.";

  // Setup: create test file
  await rm(testDir, { recursive: true, force: true });
  await mkdir(testDir, { recursive: true });
  await Bun.write(testFile, expectedContent);

  const result = await Gate.run({
    name: "read-tool",
    observe: createEmptyObserveResource(),
    act: [],
    assert: [
      // Verify: tool exists and is executable
      Assert.custom("tool_exists", async () => {
        const toolPath = `${import.meta.dir}/../src/tools/read.ts`;
        return await Bun.file(toolPath).exists();
      }),

      // Verify: tool reads file correctly
      Assert.custom("reads_file_correctly", async () => {
        const toolPath = `${import.meta.dir}/../src/tools/read.ts`;
        const proc = Bun.spawn(["bun", "run", toolPath, testFile]);
        const output = await new Response(proc.stdout).text();
        await proc.exited;
        return proc.exitCode === 0 && output.trim() === expectedContent;
      }),

      // Verify: tool fails gracefully on missing file
      Assert.custom("handles_missing_file", async () => {
        const toolPath = `${import.meta.dir}/../src/tools/read.ts`;
        const proc = Bun.spawn(["bun", "run", toolPath, "/nonexistent/file.txt"], { stderr: "pipe" });
        await proc.exited;
        return proc.exitCode !== 0;
      }),
    ],
    stop: { idleMs: 1000, maxMs: 30000 },
  });

  // Cleanup
  await rm(testDir, { recursive: true, force: true });

  return { status: result.status };
}
