#!/usr/bin/env bun
/**
 * Gate: List Tool
 *
 * Verifies: src/tools/list.ts enumerates files and directories accurately.
 *
 * The tool should:
 * - Accept a directory path as argument
 * - Output one entry per line (files and directories)
 * - Exit 0 on success, non-zero on failure
 */

import { Gate, Assert } from "../../../src/index";
import { createEmptyObserveResource } from "../../../src/utils";
import { mkdir, rm } from "node:fs/promises";

export async function run() {
  const testDir = `${import.meta.dir}/../.test-artifacts/list-test`;

  // Setup: create known directory structure
  await rm(`${import.meta.dir}/../.test-artifacts`, { recursive: true, force: true });
  await mkdir(`${testDir}/subdir`, { recursive: true });
  await Bun.write(`${testDir}/file1.txt`, "content1");
  await Bun.write(`${testDir}/file2.ts`, "content2");
  await Bun.write(`${testDir}/subdir/nested.md`, "nested");

  const result = await Gate.run({
    name: "list-tool",
    observe: createEmptyObserveResource(),
    act: [],
    assert: [
      // Verify: tool exists
      Assert.custom("tool_exists", async () => {
        const toolPath = `${import.meta.dir}/../src/tools/list.ts`;
        return await Bun.file(toolPath).exists();
      }),

      // Verify: tool lists directory contents
      Assert.custom("lists_directory", async () => {
        const toolPath = `${import.meta.dir}/../src/tools/list.ts`;
        const proc = Bun.spawn(["bun", "run", toolPath, testDir]);
        const output = await new Response(proc.stdout).text();
        await proc.exited;

        const entries = output.trim().split("\n").map(e => e.trim()).filter(Boolean);
        const hasFile1 = entries.some(e => e.includes("file1.txt"));
        const hasFile2 = entries.some(e => e.includes("file2.ts"));
        const hasSubdir = entries.some(e => e.includes("subdir"));

        return proc.exitCode === 0 && hasFile1 && hasFile2 && hasSubdir;
      }),

      // Verify: tool fails gracefully on missing directory
      Assert.custom("handles_missing_dir", async () => {
        const toolPath = `${import.meta.dir}/../src/tools/list.ts`;
        const proc = Bun.spawn(["bun", "run", toolPath, "/nonexistent/dir"], { stderr: "pipe" });
        await proc.exited;
        return proc.exitCode !== 0;
      }),
    ],
    stop: { idleMs: 1000, maxMs: 30000 },
  });

  // Cleanup
  await rm(`${import.meta.dir}/../.test-artifacts`, { recursive: true, force: true });

  return { status: result.status };
}
