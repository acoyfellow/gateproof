#!/usr/bin/env bun
/**
 * List Tool
 *
 * Lists files and directories in a given path.
 *
 * Usage: bun run list.ts <directory_path>
 * Exit: 0 on success, 1 on failure
 */

import { readdir } from "node:fs/promises";

const dirPath = process.argv[2];

if (!dirPath) {
  console.error("Usage: list.ts <directory_path>");
  process.exit(1);
}

try {
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const suffix = entry.isDirectory() ? "/" : "";
    console.log(entry.name + suffix);
  }
} catch (err) {
  console.error(`Error listing directory: ${dirPath}`);
  process.exit(1);
}
