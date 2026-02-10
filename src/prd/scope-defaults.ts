/**
 * Default scope guards for PRD stories.
 *
 * These provide sensible defaults for allowedPaths and forbiddenPaths
 * to prevent agents from modifying sensitive areas by accident.
 *
 * All defaults are opt-in and can be overridden by explicit scope configuration.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";

/**
 * Default forbidden paths that should never be modified by an agent.
 */
export const DEFAULT_FORBIDDEN_PATHS = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  ".next/",
  ".svelte-kit/",
  "coverage/",
  ".env",
  ".env.*",
  "*.log",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
  "pnpm-lock.yaml",
];

/**
 * Common source directory patterns to auto-detect.
 */
export const COMMON_SRC_PATTERNS = [
  "src/",
  "app/",
  "components/",
  "pages/",
  "lib/",
  "utils/",
  "hooks/",
  "routes/",
  "api/",
  "services/",
];

/**
 * Configuration paths that should typically be allowed but carefully.
 */
export const CONFIG_PATHS = [
  "package.json",
  "tsconfig.json",
  "vite.config.*",
  "next.config.*",
  "svelte.config.*",
  "tailwind.config.*",
  "postcss.config.*",
  "eslint.config.*",
  ".eslintrc*",
  ".prettierrc*",
];

export interface InferredScopeDefaults {
  /** Detected source directories that likely contain code to modify */
  allowedPaths: string[];
  /** Paths that should never be modified */
  forbiddenPaths: string[];
  /** Whether a monorepo structure was detected */
  isMonorepo: boolean;
  /** Root directories of detected workspaces (if monorepo) */
  workspaces: string[];
}

/**
 * Finds the project root by looking for package.json
 */
function findProjectRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== "/") {
    if (existsSync(resolve(dir, "package.json"))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return startDir;
}

/**
 * Detects if this is a monorepo and returns workspace paths
 */
function detectWorkspaces(projectRoot: string): string[] {
  try {
    const pkgPath = resolve(projectRoot, "package.json");
    if (!existsSync(pkgPath)) return [];

    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

    // npm/yarn workspaces
    if (pkg.workspaces) {
      const workspaces = Array.isArray(pkg.workspaces)
        ? pkg.workspaces
        : pkg.workspaces.packages ?? [];

      // Expand simple globs like "packages/*"
      return workspaces.flatMap((pattern: string) => {
        if (pattern.includes("*")) {
          const base = pattern.replace("/*", "").replace("/**", "");
          const basePath = resolve(projectRoot, base);
          if (existsSync(basePath)) {
            try {
              const { readdirSync, statSync } = require("node:fs");
              return readdirSync(basePath)
                .filter((name: string) => {
                  const fullPath = resolve(basePath, name);
                  return statSync(fullPath).isDirectory() && existsSync(resolve(fullPath, "package.json"));
                })
                .map((name: string) => `${base}/${name}/`);
            } catch {
              return [base + "/"];
            }
          }
          return [base + "/"];
        }
        return [pattern.endsWith("/") ? pattern : pattern + "/"];
      });
    }

    // pnpm workspaces
    const pnpmWorkspace = resolve(projectRoot, "pnpm-workspace.yaml");
    if (existsSync(pnpmWorkspace)) {
      // Simple YAML parsing for packages field
      const content = readFileSync(pnpmWorkspace, "utf-8");
      const match = content.match(/packages:\s*\n((?:\s*-\s*.+\n?)+)/);
      if (match) {
        return match[1]
          .split("\n")
          .map((line) => line.replace(/^\s*-\s*/, "").trim())
          .filter(Boolean)
          .map((p) => p.replace("/*", "/").replace("/**", "/"));
      }
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Detects which common source directories exist in the project
 */
function detectSourceDirectories(projectRoot: string): string[] {
  return COMMON_SRC_PATTERNS.filter((pattern) => {
    const dir = pattern.replace(/\/$/, "");
    return existsSync(resolve(projectRoot, dir));
  });
}

/**
 * Infers sensible scope defaults based on project structure.
 *
 * This function analyzes the project to determine:
 * - Which directories contain source code (allowedPaths)
 * - Which directories should never be modified (forbiddenPaths)
 * - Whether this is a monorepo
 *
 * @example
 * ```ts
 * const defaults = inferScopeDefaults(process.cwd());
 * console.log(defaults.allowedPaths);
 * // ["src/", "app/", "components/"]
 * ```
 */
export function inferScopeDefaults(cwd: string = process.cwd()): InferredScopeDefaults {
  const projectRoot = findProjectRoot(cwd);
  const workspaces = detectWorkspaces(projectRoot);
  const isMonorepo = workspaces.length > 0;

  let allowedPaths: string[];

  if (isMonorepo) {
    // For monorepos, allow workspace directories
    allowedPaths = workspaces;

    // Also add common patterns within workspaces
    for (const workspace of workspaces) {
      const workspacePath = resolve(projectRoot, workspace);
      const srcDirs = detectSourceDirectories(workspacePath);
      for (const src of srcDirs) {
        allowedPaths.push(`${workspace}${src}`);
      }
    }
  } else {
    // For single-package projects, detect source directories
    allowedPaths = detectSourceDirectories(projectRoot);

    // If no common directories found, allow most non-forbidden paths
    if (allowedPaths.length === 0) {
      allowedPaths = ["./"];
    }
  }

  return {
    allowedPaths,
    forbiddenPaths: [...DEFAULT_FORBIDDEN_PATHS],
    isMonorepo,
    workspaces,
  };
}

/**
 * Loads custom scope defaults from .gateproof/scope.defaults.json
 */
export function loadCustomScopeDefaults(cwd: string = process.cwd()): Partial<InferredScopeDefaults> | null {
  try {
    const defaultsPath = resolve(cwd, ".gateproof/scope.defaults.json");
    if (!existsSync(defaultsPath)) return null;

    const content = readFileSync(defaultsPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Merges inferred defaults with custom overrides.
 */
export function getScopeDefaults(cwd: string = process.cwd()): InferredScopeDefaults {
  const inferred = inferScopeDefaults(cwd);
  const custom = loadCustomScopeDefaults(cwd);

  if (!custom) return inferred;

  return {
    allowedPaths: custom.allowedPaths ?? inferred.allowedPaths,
    forbiddenPaths: custom.forbiddenPaths ?? inferred.forbiddenPaths,
    isMonorepo: custom.isMonorepo ?? inferred.isMonorepo,
    workspaces: custom.workspaces ?? inferred.workspaces,
  };
}

/**
 * Applies default scope to a story if no explicit scope is provided.
 * Returns a new story object with scope defaults applied.
 *
 * Note: This is opt-in - stories without scope are not modified unless
 * applyDefaults is called.
 */
export function applyDefaultScope<TId extends string>(
  story: { id: TId; scope?: { allowedPaths?: string[]; forbiddenPaths?: string[] } },
  defaults: InferredScopeDefaults
): { id: TId; scope: { allowedPaths: string[]; forbiddenPaths: string[] } } {
  const existingScope = story.scope ?? {};

  return {
    ...story,
    scope: {
      allowedPaths: existingScope.allowedPaths ?? defaults.allowedPaths,
      forbiddenPaths: existingScope.forbiddenPaths ?? defaults.forbiddenPaths,
      ...existingScope,
    },
  };
}
