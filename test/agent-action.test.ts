import { test, expect, describe } from "bun:test";
import { Act } from "../src/act";
import type { AgentActConfig } from "../src/act";

describe("Act.agent()", () => {
  test("creates an Agent action with correct _tag", () => {
    const action = Act.agent({
      name: "fix-auth",
      agent: "claude-code",
      model: "claude-sonnet-4-20250514",
      task: "Fix the authentication bug",
    });

    expect(action._tag).toBe("Agent");
    if (action._tag === "Agent") {
      expect(action.config.name).toBe("fix-auth");
      expect(action.config.agent).toBe("claude-code");
      expect(action.config.model).toBe("claude-sonnet-4-20250514");
      expect(action.config.task).toBe("Fix the authentication bug");
    }
  });

  test("supports optional config fields", () => {
    const action = Act.agent({
      name: "full-config",
      agent: "codex",
      model: "gpt-4o",
      task: "Build a feature",
      repo: "https://github.com/org/repo",
      env: { API_KEY: "test-key" },
      timeoutMs: 600_000,
    });

    if (action._tag === "Agent") {
      expect(action.config.repo).toBe("https://github.com/org/repo");
      expect(action.config.env).toEqual({ API_KEY: "test-key" });
      expect(action.config.timeoutMs).toBe(600_000);
    }
  });

  test("is part of the Action discriminated union", () => {
    const actions = [
      Act.deploy({ worker: "test" }),
      Act.browser({ url: "https://example.com" }),
      Act.wait(1000),
      Act.exec("npm test"),
      Act.agent({
        name: "agent",
        agent: "claude-code",
        model: "sonnet",
        task: "do stuff",
      }),
    ];

    const tags = actions.map((a) => a._tag);
    expect(tags).toEqual(["Deploy", "Browser", "Wait", "Exec", "Agent"]);
  });

  test("AgentActConfig type enforces required fields", () => {
    // TypeScript compile-time check: this should NOT compile without name, agent, model, task
    const config: AgentActConfig = {
      name: "required",
      agent: "required",
      model: "required",
      task: "required",
    };
    expect(config.name).toBe("required");
  });
});
