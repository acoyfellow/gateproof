/**
 * Authority — Governance validation for agent-executed gates.
 *
 * Validates that agent events (tools used, spawns requested, commits made)
 * comply with the StoryAuthority policy defined on the story.
 *
 * This is the enforcement layer: StoryAuthority defines what's allowed,
 * this module checks whether agent behavior stayed within bounds.
 */

import type { Log } from "./types";
import type { StoryAuthority } from "./prd/types";
import type { AgentEvent } from "./filepath-protocol";

export interface AuthorityViolation {
  rule: string;
  message: string;
  event?: AgentEvent;
  log?: Log;
}

/**
 * Validates a stream of logs against a StoryAuthority policy.
 * Returns an array of violations (empty = compliant).
 */
export function validateAuthority(
  logs: Log[],
  authority: StoryAuthority
): AuthorityViolation[] {
  const violations: AuthorityViolation[] = [];

  // Count spawns
  if (authority.canSpawn === false) {
    const spawnLogs = logs.filter((l) => l.action === "spawn");
    if (spawnLogs.length > 0) {
      violations.push({
        rule: "canSpawn",
        message: `Agent spawned ${spawnLogs.length} child agent(s) but canSpawn is false`,
        log: spawnLogs[0],
      });
    }
  }

  if (authority.maxChildAgents !== undefined) {
    const spawnCount = logs.filter((l) => l.action === "spawn").length;
    if (spawnCount > authority.maxChildAgents) {
      violations.push({
        rule: "maxChildAgents",
        message: `Agent spawned ${spawnCount} children, exceeding limit of ${authority.maxChildAgents}`,
      });
    }
  }

  // Check commits
  if (authority.canCommit === false) {
    const commitLogs = logs.filter((l) => l.action === "commit");
    if (commitLogs.length > 0) {
      violations.push({
        rule: "canCommit",
        message: `Agent made ${commitLogs.length} commit(s) but canCommit is false`,
        log: commitLogs[0],
      });
    }
  }

  // Check tool restrictions
  if (authority.allowedTools || authority.forbiddenTools) {
    const toolLogs = logs.filter((l) => l.action?.startsWith("tool:"));
    for (const log of toolLogs) {
      const toolName = log.action!.replace("tool:", "");

      if (authority.forbiddenTools?.includes(toolName)) {
        violations.push({
          rule: "forbiddenTools",
          message: `Agent used forbidden tool "${toolName}"`,
          log,
        });
      }

      if (
        authority.allowedTools &&
        authority.allowedTools.length > 0 &&
        !authority.allowedTools.includes(toolName)
      ) {
        violations.push({
          rule: "allowedTools",
          message: `Agent used tool "${toolName}" which is not in allowedTools`,
          log,
        });
      }
    }
  }

  // Check agent runtime restrictions
  if (authority.allowedAgents && authority.allowedAgents.length > 0) {
    const spawnLogs = logs.filter((l) => l.action === "spawn");
    for (const log of spawnLogs) {
      const agentType = (log.data as Record<string, unknown>)?.agent as string | undefined;
      if (agentType && !authority.allowedAgents.includes(agentType)) {
        violations.push({
          rule: "allowedAgents",
          message: `Agent spawned child with runtime "${agentType}" which is not in allowedAgents`,
          log,
        });
      }
    }
  }

  // Check model restrictions
  if (authority.allowedModels && authority.allowedModels.length > 0) {
    const spawnLogs = logs.filter((l) => l.action === "spawn");
    for (const log of spawnLogs) {
      const model = (log.data as Record<string, unknown>)?.model as string | undefined;
      if (model && !authority.allowedModels.includes(model)) {
        violations.push({
          rule: "allowedModels",
          message: `Agent spawned child with model "${model}" which is not in allowedModels`,
          log,
        });
      }
    }
  }

  return violations;
}

/**
 * Merges a story's authority with PRD-level defaults.
 * Story-level settings take precedence.
 */
export function mergeAuthority(
  storyAuthority?: StoryAuthority,
  defaultAuthority?: StoryAuthority
): StoryAuthority | undefined {
  if (!storyAuthority && !defaultAuthority) return undefined;
  if (!defaultAuthority) return storyAuthority;
  if (!storyAuthority) return defaultAuthority;

  return {
    ...defaultAuthority,
    ...storyAuthority,
    // Array fields: story overrides completely (not merged)
    allowedAgents: storyAuthority.allowedAgents ?? defaultAuthority.allowedAgents,
    allowedModels: storyAuthority.allowedModels ?? defaultAuthority.allowedModels,
    allowedTools: storyAuthority.allowedTools ?? defaultAuthority.allowedTools,
    forbiddenTools: storyAuthority.forbiddenTools ?? defaultAuthority.forbiddenTools,
  };
}

/**
 * Flattens a tree of stories (with children) into a flat array.
 * Assigns parentId to children automatically.
 */
export function flattenStoryTree<TId extends string>(
  stories: readonly import("./prd/types").Story<TId>[]
): import("./prd/types").Story<TId>[] {
  const result: import("./prd/types").Story<TId>[] = [];

  function walk(
    storyList: readonly import("./prd/types").Story<TId>[],
    parentId?: TId
  ) {
    for (const story of storyList) {
      const flat = { ...story, parentId: story.parentId ?? parentId };
      // Remove children from the flat version
      const { children, ...rest } = flat;
      result.push(rest as import("./prd/types").Story<TId>);

      if (children && children.length > 0) {
        walk(children, story.id);
      }
    }
  }

  walk(stories);
  return result;
}
