import { resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import type { PlanDefinition, ScopeFile } from "../src/index";

export const repoRoot = resolve(import.meta.dir, "..");
export const planPath = resolve(repoRoot, "plan.ts");
export const latestReportPath = resolve(repoRoot, ".gateproof", "latest.json");
export const loopBasePath = resolve(repoRoot, ".gateproof", "loop-base.json");

export interface LoopBaseRecord {
  branch: string;
  baseSha: string;
  planPath: string;
  timestamp: string;
}

export async function loadScope(): Promise<ScopeFile> {
  const module = await import("../plan");
  return module.default as ScopeFile;
}

export function selectGoalsThrough(plan: PlanDefinition, goalId: string): PlanDefinition {
  const index = plan.goals.findIndex((goal) => goal.id === goalId);
  if (index === -1) {
    throw new Error(`unknown gate ${JSON.stringify(goalId)}`);
  }

  return {
    ...plan,
    goals: plan.goals.slice(0, index + 1),
  };
}

export function readLatestReport():
  | {
    path: string;
    payload: Record<string, unknown>;
  }
  | null {
  if (!existsSync(latestReportPath)) {
    return null;
  }

  try {
    const payload = JSON.parse(readFileSync(latestReportPath, "utf8")) as Record<string, unknown>;
    return {
      path: latestReportPath,
      payload,
    };
  } catch {
    return null;
  }
}

export function readLoopBase(): LoopBaseRecord | null {
  if (!existsSync(loopBasePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(loopBasePath, "utf8")) as LoopBaseRecord;
  } catch {
    return null;
  }
}
