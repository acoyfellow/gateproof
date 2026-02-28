import { test, expect, describe } from "bun:test";
import { Effect, Queue, Runtime } from "effect";
import {
  createMockFilepathContainer,
  createFilepathBackend,
  createFilepathObserveResource,
} from "../src/filepath-backend";
import type { Log } from "../src/types";

// ─── Mock Container ───

describe("createMockFilepathContainer", () => {
  test("emits events as NDJSON lines", async () => {
    const container = createMockFilepathContainer();
    const logs: string[] = [];

    container.emit({ type: "text", content: "hello" });
    container.emit({ type: "commit", hash: "abc", message: "feat" });
    container.done();

    for await (const line of container.stdout) {
      logs.push(line);
    }

    expect(logs).toHaveLength(2);
    expect(JSON.parse(logs[0]).type).toBe("text");
    expect(JSON.parse(logs[1]).type).toBe("commit");
  });

  test("emitRaw sends raw lines", async () => {
    const container = createMockFilepathContainer();
    container.emitRaw("raw line");
    container.done();

    const lines: string[] = [];
    for await (const line of container.stdout) {
      lines.push(line);
    }
    expect(lines).toEqual(["raw line"]);
  });

  test("stop terminates the stream", async () => {
    const container = createMockFilepathContainer();
    container.emit({ type: "text", content: "before stop" });

    // Stop in a timeout to allow iteration to start
    setTimeout(() => container.stop(), 50);

    const lines: string[] = [];
    for await (const line of container.stdout) {
      lines.push(line);
    }
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  test("sendInput is a no-op in mock", async () => {
    const container = createMockFilepathContainer();
    await container.sendInput('{"type":"message","from":"user","content":"hi"}');
    container.done();
  });
});

// ─── Filepath Backend ───

describe("createFilepathBackend", () => {
  test("maps NDJSON events to Log entries", async () => {
    const container = createMockFilepathContainer();
    const backend = createFilepathBackend(container, "test-agent");

    container.emit({ type: "text", content: "thinking..." });
    container.emit({
      type: "tool",
      name: "write_file",
      path: "src/app.ts",
      status: "done",
    });
    container.emit({
      type: "commit",
      hash: "abc123",
      message: "fix: auth bug",
    });
    container.emit({ type: "done", summary: "all done" });
    container.done();

    const stream = await Effect.runPromise(backend.start());
    const logs: Log[] = [];
    for await (const log of stream) {
      logs.push(log);
    }

    expect(logs).toHaveLength(4);
    expect(logs[0].action).toBe("text");
    expect(logs[0].stage).toBe("test-agent");
    expect(logs[1].action).toBe("tool:write_file");
    expect(logs[1].status).toBe("success");
    expect(logs[2].action).toBe("commit");
    expect(logs[3].action).toBe("done");
  });

  test("skips invalid NDJSON lines gracefully", async () => {
    const container = createMockFilepathContainer();
    const backend = createFilepathBackend(container);

    container.emitRaw("not valid json");
    container.emitRaw('{"type":"unknown_event"}');
    container.emit({ type: "text", content: "valid" });
    container.emitRaw(""); // blank line
    container.emitRaw("   "); // whitespace
    container.done();

    const stream = await Effect.runPromise(backend.start());
    const logs: Log[] = [];
    for await (const log of stream) {
      logs.push(log);
    }

    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("text");
  });

  test("stop calls container.stop", async () => {
    const container = createMockFilepathContainer();
    const backend = createFilepathBackend(container);
    container.done();

    await Effect.runPromise(backend.stop());
    // No error = success
  });
});

// ─── Filepath ObserveResource ───

describe("createFilepathObserveResource", () => {
  test("creates a working ObserveResource from a container", async () => {
    const container = createMockFilepathContainer();
    const observe = createFilepathObserveResource(container, "my-agent");

    container.emit({ type: "text", content: "starting" });
    container.emit({
      type: "command",
      cmd: "npm test",
      status: "done",
      exit: 0,
      stdout: "all pass",
    });
    container.emit({ type: "done" });
    container.done();

    const stream = await Effect.runPromise(observe.start());
    const logs: Log[] = [];
    for await (const log of stream) {
      logs.push(log);
    }

    expect(logs).toHaveLength(3);
    expect(logs[0].stage).toBe("my-agent");
    expect(logs[0].action).toBe("text");
    expect(logs[1].action).toBe("cmd:npm test");
    expect(logs[2].action).toBe("done");
  });

  test("query filters logs correctly", async () => {
    const container = createMockFilepathContainer();
    const observe = createFilepathObserveResource(container, "agent");

    container.emit({ type: "text", content: "msg1" });
    container.emit({
      type: "tool",
      name: "write_file",
      status: "done",
    });
    container.emit({
      type: "command",
      cmd: "npm test",
      status: "error",
      stderr: "fail",
    });
    container.done();

    const logs = await Effect.runPromise(
      observe.query({ status: "error" })
    );

    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("cmd:npm test");
  });
});
