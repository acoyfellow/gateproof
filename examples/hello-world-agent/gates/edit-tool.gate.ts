#!/usr/bin/env bun
/**
 * Gate: Edit Tool
 *
 * Verifies: src/tools/edit.ts modifies files with string replacement.
 *
 * The tool should:
 * - Accept: file_path, old_string, new_string as arguments
 * - Replace old_string with new_string in the file
 * - Exit 0 on success, non-zero if old_string not found or file missing
 */

import { Gate, Assert } from "../../../src/index";
import { createEmptyObserveResource } from "../../../src/utils";
import { mkdir, rm } from "node:fs/promises";

export async function run() {
  const testDir = `${import.meta.dir}/../.test-artifacts`;

  // Setup
  await rm(testDir, { recursive: true, force: true });
  await mkdir(testDir, { recursive: true });

  const result = await Gate.run({
    name: "edit-tool",
    observe: createEmptyObserveResource(),
    act: [],
    assert: [
      // Verify: tool exists
      Assert.custom("tool_exists", async () => {
        const toolPath = `${import.meta.dir}/../src/tools/edit.ts`;
        return await Bun.file(toolPath).exists();
      }),

      // Verify: tool replaces string in file
      Assert.custom("replaces_string", async () => {
        const testFile = `${testDir}/edit1.txt`;
        await Bun.write(testFile, "Hello WORLD!");

        const toolPath = `${import.meta.dir}/../src/tools/edit.ts`;
        const proc = Bun.spawn(["bun", "run", toolPath, testFile, "WORLD", "gateproof"]);
        await proc.exited;

        const content = await Bun.file(testFile).text();
        return proc.exitCode === 0 && content === "Hello gateproof!";
      }),

      // Verify: tool fails if string not found
      Assert.custom("fails_if_not_found", async () => {
        const testFile = `${testDir}/edit2.txt`;
        await Bun.write(testFile, "Hello world!");

        const toolPath = `${import.meta.dir}/../src/tools/edit.ts`;
        const proc = Bun.spawn(["bun", "run", toolPath, testFile, "NOTFOUND", "replacement"], { stderr: "pipe" });
        await proc.exited;

        return proc.exitCode !== 0;
      }),

      // Verify: tool fails on missing file
      Assert.custom("handles_missing_file", async () => {
        const toolPath = `${import.meta.dir}/../src/tools/edit.ts`;
        const proc = Bun.spawn(["bun", "run", toolPath, "/nonexistent/file.txt", "a", "b"], { stderr: "pipe" });
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
