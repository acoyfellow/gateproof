#!/usr/bin/env bun
/**
 * Hierarchical PRD Pattern — Tree-structured stories with authority
 *
 * Demonstrates Phase 2 features:
 * - Story hierarchy with children[] (mirrors Filepath's agent tree)
 * - Authority policies controlling agent behavior
 * - PRD-level default authority merged with story-level overrides
 * - flattenStoryTree() for the runner
 *
 * This is a design reference — shows the types and structure, not a runnable gate.
 */

import type { Prd, Story, StoryAuthority } from "../../src/prd/types";
import { flattenStoryTree, mergeAuthority, validateAuthority } from "../../src/authority";

// ─── Define a hierarchical PRD ───

const prd: Prd = {
  // PRD-level defaults: all stories inherit these unless overridden
  defaultAuthority: {
    canSpawn: false,
    canCommit: true,
    maxChildAgents: 0,
    forbiddenTools: ["delete_file"],
    allowedModels: ["claude-sonnet-4-20250514", "claude-opus-4-20250514"],
  },

  stories: [
    {
      id: "auth-system",
      title: "Authentication System",
      gateFile: "gates/auth-system.gate.ts",
      scope: {
        allowedPaths: ["src/auth/**", "src/middleware/**"],
        maxChangedFiles: 10,
      },
      // This parent story has children — they form a tree
      children: [
        {
          id: "auth-login",
          title: "Login Flow",
          gateFile: "gates/auth-login.gate.ts",
          scope: { allowedPaths: ["src/auth/login.ts", "src/auth/session.ts"] },
          // Override: this story's agent CAN spawn a test-runner child
          authority: {
            canSpawn: true,
            maxChildAgents: 1,
            allowedAgents: ["claude-code"],
          },
        },
        {
          id: "auth-signup",
          title: "Signup Flow",
          gateFile: "gates/auth-signup.gate.ts",
          dependsOn: ["auth-login"], // Depends on login being done first
        },
        {
          id: "auth-oauth",
          title: "OAuth Integration",
          gateFile: "gates/auth-oauth.gate.ts",
          dependsOn: ["auth-login"],
          // Strict authority: no commits, read-only analysis
          authority: {
            canCommit: false,
            allowedTools: ["read_file", "search"],
          },
        },
      ],
    },
    {
      id: "api-layer",
      title: "API Layer",
      gateFile: "gates/api-layer.gate.ts",
      dependsOn: ["auth-system"],
      // Needs approval before running
      authority: {
        requiresApproval: true,
        maxDurationMs: 600_000,
      },
    },
  ],
};

// ─── Flatten the tree ───

const flat = flattenStoryTree(prd.stories);
console.log("Flattened story tree:");
for (const story of flat) {
  const indent = story.parentId ? "  " : "";
  const parent = story.parentId ? ` (parent: ${story.parentId})` : "";
  console.log(`${indent}${story.id}: ${story.title}${parent}`);
}

// ─── Merge authority ───

console.log("\nMerged authority for auth-login:");
const authLogin = flat.find((s) => s.id === "auth-login")!;
const merged = mergeAuthority(authLogin.authority, prd.defaultAuthority);
console.log(JSON.stringify(merged, null, 2));

// ─── Validate authority against mock logs ───

console.log("\nValidating mock agent behavior against auth-oauth policy:");
const authOauth = flat.find((s) => s.id === "auth-oauth")!;
const oauthAuthority = mergeAuthority(authOauth.authority, prd.defaultAuthority)!;

// Simulate: agent tried to write a file (violation: only read_file allowed)
const mockLogs = [
  { action: "tool:read_file", status: "success" as const, stage: "agent" },
  { action: "tool:write_file", status: "success" as const, stage: "agent" }, // violation!
  { action: "commit", status: "success" as const, stage: "agent" }, // violation: canCommit=false
];

const violations = validateAuthority(mockLogs, oauthAuthority);
if (violations.length > 0) {
  console.log(`Found ${violations.length} violation(s):`);
  for (const v of violations) {
    console.log(`  [${v.rule}] ${v.message}`);
  }
} else {
  console.log("No violations found.");
}
