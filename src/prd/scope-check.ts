import { execSync } from "node:child_process";
import { resolve } from "node:path";
import type { Story, StoryScope } from "./types";

export interface ScopeViolation {
  category: "scope_violation";
  message: string;
  details: {
    storyId: string;
    violation: "forbidden_path" | "max_files_exceeded" | "max_lines_exceeded" | "default_forbidden";
    path?: string;
    actualFiles?: number;
    maxFiles?: number;
    actualLines?: number;
    maxLines?: number;
  };
}

export interface DiffStats {
  changedFiles: string[];
  totalLines: number;
}

/**
 * Gets git diff stats against a base ref.
 * For CI PRs, use origin/main. For local, use HEAD or a passed ref.
 */
export function getDiffStats(baseRef: string = "HEAD"): DiffStats {
  try {
    const changedFiles = execSync(`git diff --name-only ${baseRef}`, {
      encoding: "utf-8",
      cwd: process.cwd(),
    })
      .trim()
      .split("\n")
      .filter((f) => f.length > 0);

    let totalLines = 0;
    if (changedFiles.length > 0) {
      const diffStat = execSync(`git diff --shortstat ${baseRef}`, {
        encoding: "utf-8",
        cwd: process.cwd(),
      }).trim();
      const match = diffStat.match(/(\d+)\s+files? changed/);
      if (match) {
        const linesMatch = diffStat.match(/(\d+)\s+insertions?/);
        const deletionsMatch = diffStat.match(/(\d+)\s+deletions?/);
        const insertions = linesMatch ? parseInt(linesMatch[1], 10) : 0;
        const deletions = deletionsMatch ? parseInt(deletionsMatch[1], 10) : 0;
        totalLines = insertions + deletions;
      }
    }

    return { changedFiles, totalLines };
  } catch (error) {
    throw new Error(`Failed to get git diff stats: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Checks if a path matches any of the glob patterns.
 * Simple prefix/suffix matching for now (not full glob).
 */
function matchesPattern(path: string, pattern: string): boolean {
  if (pattern.includes("**")) {
    const prefix = pattern.replace(/\*\*/g, "");
    return path.startsWith(prefix);
  }
  if (pattern.endsWith("*")) {
    return path.startsWith(pattern.slice(0, -1));
  }
  return path === pattern;
}

/**
 * Validates that changed files match the story's scope constraints.
 */
export function validateScope(
  story: Story,
  diffStats: DiffStats,
  defaultForbidden: string[] = []
): ScopeViolation[] {
  const violations: ScopeViolation[] = [];
  const scope = story.scope;

  if (!scope) {
    return violations;
  }

  const { changedFiles, totalLines } = diffStats;

  for (const file of changedFiles) {
    const filePath = resolve(process.cwd(), file);

    if (scope.forbiddenPaths) {
      for (const forbidden of scope.forbiddenPaths) {
        if (matchesPattern(file, forbidden)) {
          violations.push({
            category: "scope_violation",
            message: `Story "${story.id}" changed forbidden path: ${file}`,
            details: {
              storyId: story.id,
              violation: "forbidden_path",
              path: file,
            },
          });
        }
      }
    }

    for (const forbidden of defaultForbidden) {
      if (matchesPattern(file, forbidden)) {
        const isAllowed = scope.allowedPaths?.some((allowed) => matchesPattern(file, allowed));
        if (!isAllowed) {
          violations.push({
            category: "scope_violation",
            message: `Story "${story.id}" changed default-forbidden path: ${file}`,
            details: {
              storyId: story.id,
              violation: "default_forbidden",
              path: file,
            },
          });
        }
      }
    }

    if (scope.allowedPaths && scope.allowedPaths.length > 0) {
      const isAllowed = scope.allowedPaths.some((allowed) => matchesPattern(file, allowed));
      if (!isAllowed) {
        violations.push({
          category: "scope_violation",
          message: `Story "${story.id}" changed path outside allowed scope: ${file}`,
          details: {
            storyId: story.id,
            violation: "forbidden_path",
            path: file,
          },
        });
      }
    }
  }

  if (scope.maxChangedFiles !== undefined && changedFiles.length > scope.maxChangedFiles) {
    violations.push({
      category: "scope_violation",
      message: `Story "${story.id}" changed ${changedFiles.length} files, max allowed: ${scope.maxChangedFiles}`,
      details: {
        storyId: story.id,
        violation: "max_files_exceeded",
        actualFiles: changedFiles.length,
        maxFiles: scope.maxChangedFiles,
      },
    });
  }

  if (scope.maxChangedLines !== undefined && totalLines > scope.maxChangedLines) {
    violations.push({
      category: "scope_violation",
      message: `Story "${story.id}" changed ${totalLines} lines, max allowed: ${scope.maxChangedLines}`,
      details: {
        storyId: story.id,
        violation: "max_lines_exceeded",
        actualLines: totalLines,
        maxLines: scope.maxChangedLines,
      },
    });
  }

  return violations;
}
