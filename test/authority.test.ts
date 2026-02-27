import { test, expect, describe } from "bun:test";
import {
  validateAuthority,
  mergeAuthority,
  flattenStoryTree,
} from "../src/authority";
import type { Log } from "../src/types";
import type { StoryAuthority } from "../src/prd/types";

// ─── Authority Validation ───

describe("validateAuthority", () => {
  test("returns empty array when no violations", () => {
    const logs: Log[] = [
      { action: "text", status: "info", stage: "agent" },
      { action: "tool:read_file", status: "success", stage: "agent" },
      { action: "done", status: "success", stage: "agent" },
    ];
    const authority: StoryAuthority = {
      canSpawn: false,
      canCommit: true,
    };
    const violations = validateAuthority(logs, authority);
    expect(violations).toHaveLength(0);
  });

  test("detects spawn violation when canSpawn is false", () => {
    const logs: Log[] = [
      {
        action: "spawn",
        status: "start",
        stage: "agent",
        data: { name: "worker-1", agent: "claude-code", model: "sonnet" },
      },
    ];
    const authority: StoryAuthority = { canSpawn: false };
    const violations = validateAuthority(logs, authority);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("canSpawn");
  });

  test("detects maxChildAgents exceeded", () => {
    const logs: Log[] = [
      { action: "spawn", status: "start", data: { name: "w1", agent: "claude-code", model: "s" } },
      { action: "spawn", status: "start", data: { name: "w2", agent: "claude-code", model: "s" } },
      { action: "spawn", status: "start", data: { name: "w3", agent: "claude-code", model: "s" } },
    ];
    const authority: StoryAuthority = { maxChildAgents: 2 };
    const violations = validateAuthority(logs, authority);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("maxChildAgents");
    expect(violations[0].message).toContain("3");
    expect(violations[0].message).toContain("2");
  });

  test("detects commit violation when canCommit is false", () => {
    const logs: Log[] = [
      { action: "commit", status: "success", data: { hash: "abc", message: "feat" } },
    ];
    const authority: StoryAuthority = { canCommit: false };
    const violations = validateAuthority(logs, authority);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("canCommit");
  });

  test("detects forbidden tool usage", () => {
    const logs: Log[] = [
      { action: "tool:write_file", status: "success" },
      { action: "tool:delete_file", status: "success" },
      { action: "tool:read_file", status: "success" },
    ];
    const authority: StoryAuthority = {
      forbiddenTools: ["delete_file"],
    };
    const violations = validateAuthority(logs, authority);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("forbiddenTools");
    expect(violations[0].message).toContain("delete_file");
  });

  test("detects tool not in allowedTools", () => {
    const logs: Log[] = [
      { action: "tool:read_file", status: "success" },
      { action: "tool:write_file", status: "success" },
      { action: "tool:execute_command", status: "success" },
    ];
    const authority: StoryAuthority = {
      allowedTools: ["read_file", "write_file"],
    };
    const violations = validateAuthority(logs, authority);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("allowedTools");
    expect(violations[0].message).toContain("execute_command");
  });

  test("detects disallowed agent runtime in spawn", () => {
    const logs: Log[] = [
      {
        action: "spawn",
        status: "start",
        data: { name: "w1", agent: "codex", model: "gpt-4o" },
      },
    ];
    const authority: StoryAuthority = {
      allowedAgents: ["claude-code"],
    };
    const violations = validateAuthority(logs, authority);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("allowedAgents");
    expect(violations[0].message).toContain("codex");
  });

  test("detects disallowed model in spawn", () => {
    const logs: Log[] = [
      {
        action: "spawn",
        status: "start",
        data: { name: "w1", agent: "claude-code", model: "gpt-4o" },
      },
    ];
    const authority: StoryAuthority = {
      allowedModels: ["claude-sonnet-4-20250514", "claude-opus-4-20250514"],
    };
    const violations = validateAuthority(logs, authority);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("allowedModels");
    expect(violations[0].message).toContain("gpt-4o");
  });

  test("multiple violations are all reported", () => {
    const logs: Log[] = [
      { action: "spawn", status: "start", data: { name: "w1", agent: "codex", model: "gpt-4o" } },
      { action: "commit", status: "success", data: { hash: "abc", message: "feat" } },
      { action: "tool:delete_file", status: "success" },
    ];
    const authority: StoryAuthority = {
      canSpawn: false,
      canCommit: false,
      forbiddenTools: ["delete_file"],
    };
    const violations = validateAuthority(logs, authority);
    expect(violations.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── Authority Merging ───

describe("mergeAuthority", () => {
  test("returns undefined when both are undefined", () => {
    expect(mergeAuthority(undefined, undefined)).toBeUndefined();
  });

  test("returns story authority when no default", () => {
    const story: StoryAuthority = { canSpawn: true };
    expect(mergeAuthority(story, undefined)).toEqual(story);
  });

  test("returns default when no story authority", () => {
    const defaults: StoryAuthority = { canCommit: false };
    expect(mergeAuthority(undefined, defaults)).toEqual(defaults);
  });

  test("story overrides default", () => {
    const defaults: StoryAuthority = {
      canSpawn: false,
      canCommit: false,
      maxChildAgents: 5,
    };
    const story: StoryAuthority = {
      canSpawn: true,
      maxChildAgents: 2,
    };
    const merged = mergeAuthority(story, defaults)!;
    expect(merged.canSpawn).toBe(true); // overridden
    expect(merged.canCommit).toBe(false); // inherited
    expect(merged.maxChildAgents).toBe(2); // overridden
  });

  test("story array fields override completely (not merged)", () => {
    const defaults: StoryAuthority = {
      allowedTools: ["read_file", "write_file"],
      forbiddenTools: ["delete_file"],
    };
    const story: StoryAuthority = {
      allowedTools: ["read_file"],
    };
    const merged = mergeAuthority(story, defaults)!;
    expect(merged.allowedTools).toEqual(["read_file"]);
    expect(merged.forbiddenTools).toEqual(["delete_file"]); // inherited
  });
});

// ─── Story Tree Flattening ───

describe("flattenStoryTree", () => {
  test("flat stories remain flat", () => {
    const stories = [
      { id: "s1", title: "Story 1", gateFile: "gates/s1.ts" },
      { id: "s2", title: "Story 2", gateFile: "gates/s2.ts" },
    ];
    const flat = flattenStoryTree(stories);
    expect(flat).toHaveLength(2);
    expect(flat[0].id).toBe("s1");
    expect(flat[1].id).toBe("s2");
  });

  test("children are flattened with parentId set", () => {
    const stories = [
      {
        id: "parent",
        title: "Parent",
        gateFile: "gates/parent.ts",
        children: [
          { id: "child1", title: "Child 1", gateFile: "gates/child1.ts" },
          { id: "child2", title: "Child 2", gateFile: "gates/child2.ts" },
        ],
      },
    ];
    const flat = flattenStoryTree(stories);
    expect(flat).toHaveLength(3);
    expect(flat[0].id).toBe("parent");
    expect(flat[0].parentId).toBeUndefined();
    expect(flat[1].id).toBe("child1");
    expect(flat[1].parentId).toBe("parent");
    expect(flat[2].id).toBe("child2");
    expect(flat[2].parentId).toBe("parent");
  });

  test("deeply nested children are flattened", () => {
    const stories = [
      {
        id: "root",
        title: "Root",
        gateFile: "gates/root.ts",
        children: [
          {
            id: "mid",
            title: "Mid",
            gateFile: "gates/mid.ts",
            children: [
              { id: "leaf", title: "Leaf", gateFile: "gates/leaf.ts" },
            ],
          },
        ],
      },
    ];
    const flat = flattenStoryTree(stories);
    expect(flat).toHaveLength(3);
    expect(flat[0].id).toBe("root");
    expect(flat[1].id).toBe("mid");
    expect(flat[1].parentId).toBe("root");
    expect(flat[2].id).toBe("leaf");
    expect(flat[2].parentId).toBe("mid");
  });

  test("children field is removed from flattened stories", () => {
    const stories = [
      {
        id: "parent",
        title: "Parent",
        gateFile: "gates/p.ts",
        children: [
          { id: "child", title: "Child", gateFile: "gates/c.ts" },
        ],
      },
    ];
    const flat = flattenStoryTree(stories);
    for (const story of flat) {
      expect((story as any).children).toBeUndefined();
    }
  });

  test("explicit parentId is preserved over inferred", () => {
    const stories = [
      {
        id: "parent",
        title: "Parent",
        gateFile: "gates/p.ts",
        children: [
          {
            id: "child",
            title: "Child",
            gateFile: "gates/c.ts",
            parentId: "other-parent", // explicit
          },
        ],
      },
    ];
    const flat = flattenStoryTree(stories);
    expect(flat[1].parentId).toBe("other-parent");
  });
});
