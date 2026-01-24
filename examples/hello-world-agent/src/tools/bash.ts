#!/usr/bin/env bun
/**
 * Bash Tool
 *
 * Executes a shell command and outputs result.
 *
 * Usage: bun run bash.ts <command>
 * Exit: Same as the command's exit code
 */

const command = process.argv[2];

if (!command) {
  console.error("Usage: bash.ts <command>");
  process.exit(1);
}

const proc = Bun.spawn(["sh", "-c", command], {
  stdout: "inherit",
  stderr: "inherit",
});

await proc.exited;
process.exit(proc.exitCode ?? 1);
