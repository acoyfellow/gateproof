#!/usr/bin/env bun
/**
 * Read Tool
 *
 * Reads a file and outputs its contents to stdout.
 *
 * Usage: bun run read.ts <file_path>
 * Exit: 0 on success, 1 on failure
 */

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: read.ts <file_path>");
  process.exit(1);
}

const file = Bun.file(filePath);

if (!await file.exists()) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const content = await file.text();
process.stdout.write(content);
