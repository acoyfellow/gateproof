import { test, expect, describe } from "bun:test";
import {
  parseAgentEvent,
  agentEventToLog,
  ndjsonLineToLog,
  serializeInput,
  AgentEvent,
  TextEvent,
  ToolEvent,
  CommandEvent,
  CommitEvent,
  SpawnEvent,
  WorkersEvent,
  StatusEvent,
  HandoffEvent,
  DoneEvent,
  UserMessage,
  SignalMessage,
  AgentInput,
} from "../src/filepath-protocol";

// ─── Schema Validation ───

describe("Filepath Protocol Schemas", () => {
  test("TextEvent parses correctly", () => {
    const result = TextEvent.safeParse({ type: "text", content: "hello world" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("text");
      expect(result.data.content).toBe("hello world");
    }
  });

  test("ToolEvent parses with all fields", () => {
    const result = ToolEvent.safeParse({
      type: "tool",
      name: "write_file",
      path: "src/auth.ts",
      status: "done",
      output: "file written",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("write_file");
      expect(result.data.path).toBe("src/auth.ts");
      expect(result.data.status).toBe("done");
      expect(result.data.output).toBe("file written");
    }
  });

  test("ToolEvent parses with minimal fields", () => {
    const result = ToolEvent.safeParse({
      type: "tool",
      name: "read_file",
      status: "start",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.path).toBeUndefined();
      expect(result.data.output).toBeUndefined();
    }
  });

  test("CommandEvent parses correctly", () => {
    const result = CommandEvent.safeParse({
      type: "command",
      cmd: "npm test",
      status: "done",
      exit: 0,
      stdout: "all tests pass",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cmd).toBe("npm test");
      expect(result.data.exit).toBe(0);
    }
  });

  test("CommitEvent parses correctly", () => {
    const result = CommitEvent.safeParse({
      type: "commit",
      hash: "abc1234",
      message: "feat: add authentication",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hash).toBe("abc1234");
    }
  });

  test("SpawnEvent parses correctly", () => {
    const result = SpawnEvent.safeParse({
      type: "spawn",
      name: "worker-1",
      agent: "claude-code",
      model: "claude-sonnet-4-20250514",
      task: "fix the bug",
    });
    expect(result.success).toBe(true);
  });

  test("WorkersEvent parses correctly", () => {
    const result = WorkersEvent.safeParse({
      type: "workers",
      workers: [
        { name: "worker-1", status: "running" },
        { name: "worker-2", status: "done" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workers).toHaveLength(2);
    }
  });

  test("StatusEvent parses with context_pct", () => {
    const result = StatusEvent.safeParse({
      type: "status",
      state: "running",
      context_pct: 0.75,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.context_pct).toBe(0.75);
    }
  });

  test("StatusEvent rejects invalid context_pct", () => {
    const result = StatusEvent.safeParse({
      type: "status",
      state: "running",
      context_pct: 1.5,
    });
    expect(result.success).toBe(false);
  });

  test("HandoffEvent parses correctly", () => {
    const result = HandoffEvent.safeParse({
      type: "handoff",
      summary: "context limit reached, handing off",
    });
    expect(result.success).toBe(true);
  });

  test("DoneEvent parses with and without summary", () => {
    expect(DoneEvent.safeParse({ type: "done" }).success).toBe(true);
    expect(
      DoneEvent.safeParse({ type: "done", summary: "task completed" }).success
    ).toBe(true);
  });

  test("AgentEvent discriminated union parses all types", () => {
    const events = [
      { type: "text", content: "hello" },
      { type: "tool", name: "read", status: "start" },
      { type: "command", cmd: "ls", status: "done" },
      { type: "commit", hash: "abc", message: "feat" },
      { type: "spawn", name: "w1", agent: "claude-code", model: "sonnet" },
      { type: "workers", workers: [] },
      { type: "status", state: "idle" },
      { type: "handoff", summary: "done" },
      { type: "done" },
    ];
    for (const event of events) {
      const result = AgentEvent.safeParse(event);
      expect(result.success).toBe(true);
    }
  });

  test("AgentEvent rejects unknown type", () => {
    const result = AgentEvent.safeParse({ type: "unknown", data: "test" });
    expect(result.success).toBe(false);
  });

  test("UserMessage parses correctly", () => {
    const result = UserMessage.safeParse({
      type: "message",
      from: "user",
      content: "fix the bug",
    });
    expect(result.success).toBe(true);
  });

  test("SignalMessage parses correctly", () => {
    for (const action of ["stop", "pause", "resume"]) {
      const result = SignalMessage.safeParse({ type: "signal", action });
      expect(result.success).toBe(true);
    }
  });

  test("AgentInput discriminated union works", () => {
    expect(
      AgentInput.safeParse({
        type: "message",
        from: "parent",
        content: "hello",
      }).success
    ).toBe(true);
    expect(
      AgentInput.safeParse({ type: "signal", action: "stop" }).success
    ).toBe(true);
  });
});

// ─── NDJSON Parsing ───

describe("NDJSON Parsing", () => {
  test("parseAgentEvent parses valid NDJSON line", () => {
    const line = '{"type":"text","content":"hello"}';
    const event = parseAgentEvent(line);
    expect(event).not.toBeNull();
    expect(event!.type).toBe("text");
  });

  test("parseAgentEvent returns null for invalid JSON", () => {
    expect(parseAgentEvent("not json")).toBeNull();
    expect(parseAgentEvent("")).toBeNull();
    expect(parseAgentEvent("{incomplete")).toBeNull();
  });

  test("parseAgentEvent returns null for valid JSON but invalid event", () => {
    expect(parseAgentEvent('{"type":"unknown"}')).toBeNull();
    expect(parseAgentEvent('{"foo":"bar"}')).toBeNull();
  });

  test("serializeInput produces valid NDJSON", () => {
    const line = serializeInput({
      type: "message",
      from: "user",
      content: "hello",
    });
    expect(line).toBe('{"type":"message","from":"user","content":"hello"}');
    expect(line).not.toContain("\n");
  });
});

// ─── Event → Log Mapping ───

describe("agentEventToLog", () => {
  test("TextEvent maps to info log", () => {
    const log = agentEventToLog({ type: "text", content: "thinking..." });
    expect(log.action).toBe("text");
    expect(log.status).toBe("info");
    expect(log.stage).toBe("agent");
    expect((log.data as any).content).toBe("thinking...");
    expect(log.timestamp).toBeDefined();
  });

  test("TextEvent uses custom agent name", () => {
    const log = agentEventToLog(
      { type: "text", content: "hi" },
      "fix-auth-agent"
    );
    expect(log.stage).toBe("fix-auth-agent");
  });

  test("ToolEvent start maps correctly", () => {
    const log = agentEventToLog({
      type: "tool",
      name: "write_file",
      path: "src/auth.ts",
      status: "start",
    });
    expect(log.action).toBe("tool:write_file");
    expect(log.status).toBe("start");
    expect((log.data as any).name).toBe("write_file");
    expect((log.data as any).path).toBe("src/auth.ts");
  });

  test("ToolEvent done maps to success", () => {
    const log = agentEventToLog({
      type: "tool",
      name: "read_file",
      status: "done",
      output: "file contents",
    });
    expect(log.status).toBe("success");
    expect((log.data as any).output).toBe("file contents");
  });

  test("ToolEvent error maps to error", () => {
    const log = agentEventToLog({
      type: "tool",
      name: "write_file",
      status: "error",
    });
    expect(log.status).toBe("error");
  });

  test("CommandEvent maps correctly with stderr error", () => {
    const log = agentEventToLog({
      type: "command",
      cmd: "npm test",
      status: "error",
      exit: 1,
      stderr: "test failed",
    });
    expect(log.action).toBe("cmd:npm test");
    expect(log.status).toBe("error");
    expect(log.error?.tag).toBe("CommandError");
    expect(log.error?.message).toBe("test failed");
    expect((log.data as any).exit).toBe(1);
  });

  test("CommandEvent success has no error field", () => {
    const log = agentEventToLog({
      type: "command",
      cmd: "npm build",
      status: "done",
      exit: 0,
      stdout: "compiled",
    });
    expect(log.status).toBe("success");
    expect(log.error).toBeUndefined();
  });

  test("CommitEvent maps to success with data", () => {
    const log = agentEventToLog({
      type: "commit",
      hash: "abc1234def",
      message: "feat: add login",
    });
    expect(log.action).toBe("commit");
    expect(log.status).toBe("success");
    expect((log.data as any).hash).toBe("abc1234def");
    expect((log.data as any).message).toBe("feat: add login");
  });

  test("SpawnEvent maps to start", () => {
    const log = agentEventToLog({
      type: "spawn",
      name: "worker-1",
      agent: "claude-code",
      model: "claude-sonnet-4-20250514",
      task: "fix auth",
    });
    expect(log.action).toBe("spawn");
    expect(log.status).toBe("start");
    expect((log.data as any).name).toBe("worker-1");
    expect((log.data as any).agent).toBe("claude-code");
    expect((log.data as any).task).toBe("fix auth");
  });

  test("WorkersEvent maps to info", () => {
    const log = agentEventToLog({
      type: "workers",
      workers: [{ name: "w1", status: "done" }],
    });
    expect(log.action).toBe("workers");
    expect(log.status).toBe("info");
    expect((log.data as any).workers).toHaveLength(1);
  });

  test("StatusEvent maps state to log status", () => {
    const cases: Array<[string, string]> = [
      ["idle", "info"],
      ["thinking", "start"],
      ["running", "start"],
      ["done", "success"],
      ["error", "error"],
    ];
    for (const [state, expectedStatus] of cases) {
      const log = agentEventToLog({
        type: "status",
        state: state as any,
      });
      expect(log.status).toBe(expectedStatus as any);
      expect((log.data as any).state).toBe(state);
    }
  });

  test("StatusEvent includes context_pct", () => {
    const log = agentEventToLog({
      type: "status",
      state: "running",
      context_pct: 0.85,
    });
    expect((log.data as any).context_pct).toBe(0.85);
  });

  test("HandoffEvent maps to info", () => {
    const log = agentEventToLog({
      type: "handoff",
      summary: "context limit, handing off",
    });
    expect(log.action).toBe("handoff");
    expect(log.status).toBe("info");
    expect((log.data as any).summary).toBe("context limit, handing off");
  });

  test("DoneEvent maps to success", () => {
    const log = agentEventToLog({
      type: "done",
      summary: "task completed successfully",
    });
    expect(log.action).toBe("done");
    expect(log.status).toBe("success");
    expect((log.data as any).summary).toBe("task completed successfully");
  });

  test("DoneEvent without summary still works", () => {
    const log = agentEventToLog({ type: "done" });
    expect(log.action).toBe("done");
    expect(log.status).toBe("success");
  });
});

// ─── ndjsonLineToLog convenience ───

describe("ndjsonLineToLog", () => {
  test("valid line returns a Log", () => {
    const log = ndjsonLineToLog('{"type":"text","content":"hi"}');
    expect(log).not.toBeNull();
    expect(log!.action).toBe("text");
  });

  test("invalid line returns null", () => {
    expect(ndjsonLineToLog("garbage")).toBeNull();
    expect(ndjsonLineToLog("")).toBeNull();
    expect(ndjsonLineToLog('{"type":"invalid"}')).toBeNull();
  });

  test("custom agent name is forwarded", () => {
    const log = ndjsonLineToLog(
      '{"type":"commit","hash":"abc","message":"feat"}',
      "my-agent"
    );
    expect(log!.stage).toBe("my-agent");
  });
});
