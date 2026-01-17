#!/usr/bin/env bun
/**
 * Script to embed demo HTML into worker.ts
 * This reads index.html and embeds it as a string constant
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const htmlPath = join(import.meta.dir, "index.html");
const workerPath = join(import.meta.dir, "worker.ts");

const html = readFileSync(htmlPath, "utf-8");
const worker = readFileSync(workerPath, "utf-8");

// Escape the HTML for embedding in a template string
const escapedHtml = html
  .replace(/\\/g, "\\\\")
  .replace(/`/g, "\\`")
  .replace(/\${/g, "\\${");

// Replace the getDemoHTML function - match from function start to closing backtick and brace
const functionStart = worker.indexOf('function getDemoHTML(): string {');
if (functionStart === -1) {
  console.error('❌ Could not find getDemoHTML function');
  process.exit(1);
}

// Find the end of the function - look for return `...`; }
let i = functionStart + 'function getDemoHTML(): string {'.length;
let templateStart = -1;
let templateEnd = -1;

// Find the opening backtick after "return"
for (; i < worker.length; i++) {
  if (worker.substring(i, i + 6) === 'return') {
    i += 6;
    // Skip whitespace
    while (i < worker.length && /\s/.test(worker[i])) i++;
    if (worker[i] === '`') {
      templateStart = i;
      i++;
      break;
    }
  }
}

if (templateStart === -1) {
  console.error('❌ Could not find template literal start');
  process.exit(1);
}

// Find the closing backtick - need to handle escaped backticks
let backtickCount = 0;
for (; i < worker.length; i++) {
  if (worker[i] === '\\' && worker[i + 1] === '`') {
    i++; // Skip escaped backtick
    continue;
  }
  if (worker[i] === '`') {
    templateEnd = i;
    i++;
    // Skip semicolon and whitespace
    while (i < worker.length && (worker[i] === ';' || /\s/.test(worker[i]))) i++;
    // Find the closing brace
    if (worker[i] === '}') {
      break;
    }
  }
}

if (templateEnd === -1) {
  console.error('❌ Could not find template literal end');
  process.exit(1);
}

const beforeFunction = worker.substring(0, functionStart);
const afterFunction = worker.substring(i + 1);

const updatedWorker = `${beforeFunction}function getDemoHTML(): string {
  return \`${escapedHtml}\`;
}${afterFunction}`;

writeFileSync(workerPath, updatedWorker, "utf-8");
console.log("✅ Embedded demo HTML into worker.ts");
