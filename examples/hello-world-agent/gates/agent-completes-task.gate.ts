#!/usr/bin/env bun
/**
 * Gate: Agent Completes Task
 *
 * Verifies: Given a real task, the agent produces correct output.
 *
 * Task: "Create a file called hello.txt with the content 'Hello, World!'"
 *
 * The agent should:
 * - Understand the task
 * - Use the edit/bash tool to create the file
 * - Produce the correct output
 */

import { Gate, Assert } from "../../../src/index";
import { createEmptyObserveResource } from "../../../src/utils";
import { mkdir, rm } from "node:fs/promises";

export async function run() {
  const testDir = `${import.meta.dir}/../.test-artifacts/e2e`;
  const expectedFile = `${testDir}/hello.txt`;
  const expectedContent = "Hello, World!";

  // Setup: clean test directory
  await rm(testDir, { recursive: true, force: true });
  await mkdir(testDir, { recursive: true });

  const result = await Gate.run({
    name: "agent-completes-task",
    observe: createEmptyObserveResource(),
    act: [],
    assert: [
      // Verify: agent can complete the task
      Assert.custom("creates_file_with_content", async () => {
        const agentPath = `${import.meta.dir}/../src/agent.ts`;
        const prompt = `Create a file at ${expectedFile} with exactly this content: ${expectedContent}`;

        const proc = Bun.spawn([
          "bun", "run", agentPath,
          "--prompt", prompt,
          "--max-turns", "10",
        ], {
          stderr: "pipe",
          stdout: "pipe",
          env: process.env,
        });

        const stderr = await new Response(proc.stderr).text();
        await proc.exited;

        // Debug: log any errors
        if (proc.exitCode !== 0) {
          console.error("Agent failed:", stderr);
        }

        // Check if file was created with correct content
        const file = Bun.file(expectedFile);
        if (!await file.exists()) {
          return false;
        }

        const content = await file.text();
        return content.trim() === expectedContent;
      }),
    ],
    stop: { idleMs: 5000, maxMs: 120000 },
  });

  // Cleanup
  await rm(testDir, { recursive: true, force: true });

  return { status: result.status };
}
