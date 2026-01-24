#!/usr/bin/env bun
/**
 * Search Tool
 *
 * Searches for a pattern in files using ripgrep.
 *
 * Usage: bun run search.ts <pattern> <path>
 * Exit: 0 if matches found, 1 if no matches, other on error
 */

const [pattern, searchPath] = process.argv.slice(2);

if (!pattern || !searchPath) {
  console.error("Usage: search.ts <pattern> <path>");
  process.exit(1);
}

const proc = Bun.spawn(["rg", "--line-number", pattern, searchPath], {
  stdout: "inherit",
  stderr: "inherit",
});

await proc.exited;
process.exit(proc.exitCode ?? 1);
