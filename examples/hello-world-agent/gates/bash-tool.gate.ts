#!/usr/bin/env bun
/**
 * Gate: Bash Tool
 *
 * Verifies: src/tools/bash.ts executes commands and captures output.
 *
 * The tool should:
 * - Accept a command string as argument
 * - Execute it in a shell
 * - Output stdout to stdout, stderr to stderr
 * - Exit with the command's exit code
 */

import { Gate, Assert } from "../../../src/index";
import { createEmptyObserveResource } from "../../../src/utils";

export async function run() {
  const result = await Gate.run({
    name: "bash-tool",
    observe: createEmptyObserveResource(),
    act: [],
    assert: [
      // Verify: tool exists
      Assert.custom("tool_exists", async () => {
        const toolPath = `${import.meta.dir}/../src/tools/bash.ts`;
        return await Bun.file(toolPath).exists();
      }),

      // Verify: tool executes command and captures stdout
      Assert.custom("captures_stdout", async () => {
        const toolPath = `${import.meta.dir}/../src/tools/bash.ts`;
        const proc = Bun.spawn(["bun", "run", toolPath, "echo hello"]);
        const output = await new Response(proc.stdout).text();
        await proc.exited;
        return proc.exitCode === 0 && output.trim() === "hello";
      }),

      // Verify: tool captures stderr
      Assert.custom("captures_stderr", async () => {
        const toolPath = `${import.meta.dir}/../src/tools/bash.ts`;
        const proc = Bun.spawn(["bun", "run", toolPath, "echo error >&2"], { stderr: "pipe" });
        const stderr = await new Response(proc.stderr).text();
        await proc.exited;
        return stderr.trim() === "error";
      }),

      // Verify: tool returns correct exit code
      Assert.custom("returns_exit_code", async () => {
        const toolPath = `${import.meta.dir}/../src/tools/bash.ts`;

        const success = Bun.spawn(["bun", "run", toolPath, "true"]);
        await success.exited;

        const failure = Bun.spawn(["bun", "run", toolPath, "exit 42"], { stderr: "pipe" });
        await failure.exited;

        return success.exitCode === 0 && failure.exitCode === 42;
      }),
    ],
    stop: { idleMs: 1000, maxMs: 30000 },
  });

  return { status: result.status };
}
