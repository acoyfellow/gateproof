import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const supportedExtensions = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".svelte",
]);

const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".svelte-kit",
  ".vercel",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

type Finding = {
  file: string;
  line: number;
  kind: "explicit-any" | "merge-marker";
  snippet: string;
};

const explicitAnyPatterns = [
  /:\s*any\b/,
  /\bas\s+any\b/,
  /<\s*any\s*>/,
  /\bany\[\]/,
  /\b(?:Array|Promise|ReadonlyArray|Record|Map|Set)\s*<[^>\n]*\bany\b/,
];

const mergeMarkerPattern = /^(<<<<<<<|=======|>>>>>>>)(?:\s|$)/;

async function collectFiles(entryPath: string, out: string[]): Promise<void> {
  const stats = await stat(entryPath);
  if (stats.isDirectory()) {
    const baseName = path.basename(entryPath);
    if (ignoredDirectories.has(baseName)) {
      return;
    }

    const entries = await readdir(entryPath, { withFileTypes: true });
    for (const entry of entries) {
      await collectFiles(path.join(entryPath, entry.name), out);
    }
    return;
  }

  if (supportedExtensions.has(path.extname(entryPath))) {
    out.push(entryPath);
  }
}

async function findIssues(filePath: string): Promise<Finding[]> {
  const source = await readFile(filePath, "utf8");
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    if (mergeMarkerPattern.test(line)) {
      findings.push({
        file: filePath,
        line: index + 1,
        kind: "merge-marker",
        snippet: line.trim(),
      });
      continue;
    }

    if (explicitAnyPatterns.some((pattern) => pattern.test(line))) {
      findings.push({
        file: filePath,
        line: index + 1,
        kind: "explicit-any",
        snippet: line.trim(),
      });
    }
  }

  return findings;
}

function normalizeTargets(args: string[]): string[] {
  if (args.length === 0) {
    return ["."];
  }

  return args;
}

const targets = normalizeTargets(process.argv.slice(2));
const files: string[] = [];

for (const target of targets) {
  await collectFiles(path.resolve(target), files);
}

const findings: Finding[] = [];
for (const file of files) {
  findings.push(...(await findIssues(file)));
}

if (findings.length === 0) {
  console.log(`lint: ok (${files.length} files checked)`);
  process.exit(0);
}

for (const finding of findings) {
  console.error(
    `${path.relative(process.cwd(), finding.file)}:${finding.line} ${finding.kind}: ${finding.snippet}`,
  );
}

console.error(`lint: failed (${findings.length} issue${findings.length === 1 ? "" : "s"})`);
process.exit(1);
