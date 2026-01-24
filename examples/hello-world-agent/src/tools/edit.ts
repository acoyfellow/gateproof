#!/usr/bin/env bun
/**
 * Edit Tool
 *
 * Replaces a string in a file.
 *
 * Usage: bun run edit.ts <file_path> <old_string> <new_string>
 * Exit: 0 on success, 1 if string not found or file missing
 */

const [filePath, oldString, newString] = process.argv.slice(2);

if (!filePath || oldString === undefined || newString === undefined) {
  console.error("Usage: edit.ts <file_path> <old_string> <new_string>");
  process.exit(1);
}

const file = Bun.file(filePath);

if (!await file.exists()) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const content = await file.text();

if (!content.includes(oldString)) {
  console.error(`String not found in file: "${oldString}"`);
  process.exit(1);
}

const newContent = content.replace(oldString, newString);
await Bun.write(filePath, newContent);
