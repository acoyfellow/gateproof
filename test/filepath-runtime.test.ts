import { test, expect, describe } from "bun:test";
import { Effect } from "effect";
import {
  BroadcastIterable,
  pipeReadableStreamToLines,
  CloudflareSandboxRuntime,
} from "../src/filepath-runtime";
import type { SandboxInstance, SandboxProcess } from "../src/filepath-runtime";
import {
  createFilepathBackend,
  createFilepathObserveResource,
} from "../src/filepath-backend";
import type { Log } from "../src/types";

// ─── BroadcastIterable ───

describe("BroadcastIterable", () => {
  test("single reader sees all items", async () => {
    const b = new BroadcastIterable<string>();
    b.push("a");
    b.push("b");
    b.push("c");
    b.end();

    const items: string[] = [];
    for await (const item of b) {
      items.push(item);
    }
    expect(items).toEqual(["a", "b", "c"]);
  });

  test("two concurrent readers each see all items", async () => {
    const b = new BroadcastIterable<string>();

    // Start both readers before pushing items
    const reader1: string[] = [];
    const reader2: string[] = [];

    const p1 = (async () => {
      for await (const item of b) reader1.push(item);
    })();
    const p2 = (async () => {
      for await (const item of b) reader2.push(item);
    })();

    // Push items after readers are waiting
    await new Promise((r) => setTimeout(r, 10));
    b.push("x");
    b.push("y");
    b.end();

    await Promise.all([p1, p2]);

    expect(reader1).toEqual(["x", "y"]);
    expect(reader2).toEqual(["x", "y"]);
  });

  test("late reader sees buffered items", async () => {
    const b = new BroadcastIterable<number>();
    b.push(1);
    b.push(2);

    // Start reader after items are buffered
    await new Promise((r) => setTimeout(r, 10));
    b.push(3);
    b.end();

    const items: number[] = [];
    for await (const item of b) {
      items.push(item);
    }
    expect(items).toEqual([1, 2, 3]);
  });

  test("empty broadcast ends immediately", async () => {
    const b = new BroadcastIterable<string>();
    b.end();

    const items: string[] = [];
    for await (const item of b) {
      items.push(item);
    }
    expect(items).toEqual([]);
  });

  test("reader started after end sees all buffered items", async () => {
    const b = new BroadcastIterable<string>();
    b.push("a");
    b.push("b");
    b.end();

    // Reader starts after end() — should still drain the buffer
    const items: string[] = [];
    for await (const item of b) {
      items.push(item);
    }
    expect(items).toEqual(["a", "b"]);
  });
});

// ─── pipeReadableStreamToLines ───

describe("pipeReadableStreamToLines", () => {
  function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });
  }

  test("splits complete lines", async () => {
    const broadcast = new BroadcastIterable<string>();
    const stream = makeStream(['{"type":"text","content":"hi"}\n{"type":"done"}\n']);

    await pipeReadableStreamToLines(stream, broadcast);

    const lines: string[] = [];
    for await (const line of broadcast) {
      lines.push(line);
    }
    expect(lines).toEqual(['{"type":"text","content":"hi"}', '{"type":"done"}']);
  });

  test("handles partial chunks across reads", async () => {
    const broadcast = new BroadcastIterable<string>();
    const stream = makeStream([
      '{"type":"te',
      'xt","content":"hello"}\n{"ty',
      'pe":"done"}\n',
    ]);

    await pipeReadableStreamToLines(stream, broadcast);

    const lines: string[] = [];
    for await (const line of broadcast) {
      lines.push(line);
    }
    expect(lines).toEqual([
      '{"type":"text","content":"hello"}',
      '{"type":"done"}',
    ]);
  });

  test("flushes final partial line without trailing newline", async () => {
    const broadcast = new BroadcastIterable<string>();
    const stream = makeStream(['{"type":"done"}']);

    await pipeReadableStreamToLines(stream, broadcast);

    const lines: string[] = [];
    for await (const line of broadcast) {
      lines.push(line);
    }
    expect(lines).toEqual(['{"type":"done"}']);
  });

  test("skips empty lines", async () => {
    const broadcast = new BroadcastIterable<string>();
    const stream = makeStream(["line1\n\n\nline2\n"]);

    await pipeReadableStreamToLines(stream, broadcast);

    const lines: string[] = [];
    for await (const line of broadcast) {
      lines.push(line);
    }
    expect(lines).toEqual(["line1", "line2"]);
  });

  test("empty stream ends broadcast", async () => {
    const broadcast = new BroadcastIterable<string>();
    const stream = makeStream([]);

    await pipeReadableStreamToLines(stream, broadcast);

    const lines: string[] = [];
    for await (const line of broadcast) {
      lines.push(line);
    }
    expect(lines).toEqual([]);
  });
});

// ─── CloudflareSandboxRuntime ───

describe("CloudflareSandboxRuntime", () => {
  /**
   * Creates a mock SandboxInstance that emits the given NDJSON events.
   */
  function createMockSandbox(
    events: string[],
    opts?: { captureStdin?: string[] }
  ): SandboxInstance {
    const encoder = new TextEncoder();

    return {
      async startProcess(command, options) {
        const stdout = new ReadableStream<Uint8Array>({
          start(controller) {
            const payload = events.map((e) => e + "\n").join("");
            controller.enqueue(encoder.encode(payload));
            controller.close();
          },
        });

        const stdinChunks = opts?.captureStdin;
        const stdin = new WritableStream<Uint8Array>({
          write(chunk) {
            if (stdinChunks) {
              stdinChunks.push(new TextDecoder().decode(chunk));
            }
          },
        });

        return { stdout, stdin };
      },
    };
  }

  test("spawn returns a working FilepathContainer", async () => {
    const events = [
      '{"type":"status","state":"thinking"}',
      '{"type":"text","content":"hello"}',
      '{"type":"done","summary":"finished"}',
    ];

    const runtime = new CloudflareSandboxRuntime({
      getSandbox: () => createMockSandbox(events),
    });

    const container = await runtime.spawn({
      name: "test-agent",
      agent: "claude-code",
      model: "test-model",
      task: "do something",
    });

    const lines: string[] = [];
    for await (const line of container.stdout) {
      lines.push(line);
    }

    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0]).type).toBe("status");
    expect(JSON.parse(lines[1]).type).toBe("text");
    expect(JSON.parse(lines[2]).type).toBe("done");
  });

  test("two readers see all events (tee behavior)", async () => {
    const events = [
      '{"type":"text","content":"msg1"}',
      '{"type":"commit","hash":"abc","message":"fix"}',
      '{"type":"done"}',
    ];

    const runtime = new CloudflareSandboxRuntime({
      getSandbox: () => createMockSandbox(events),
    });

    const container = await runtime.spawn({
      name: "test",
      agent: "claude-code",
      model: "m",
      task: "t",
    });

    // Simulate executor + observe both reading stdout
    const reader1: string[] = [];
    const reader2: string[] = [];

    await Promise.all([
      (async () => {
        for await (const line of container.stdout) reader1.push(line);
      })(),
      (async () => {
        for await (const line of container.stdout) reader2.push(line);
      })(),
    ]);

    expect(reader1).toHaveLength(3);
    expect(reader2).toHaveLength(3);
    expect(reader1).toEqual(reader2);
  });

  test("sendInput writes to stdin", async () => {
    const captured: string[] = [];
    const runtime = new CloudflareSandboxRuntime({
      getSandbox: () => createMockSandbox(["{}"], { captureStdin: captured }),
    });

    const container = await runtime.spawn({
      name: "test",
      agent: "a",
      model: "m",
      task: "t",
    });

    await container.sendInput('{"type":"message","from":"user","content":"hi"}');

    // Wait for stdout to drain
    for await (const _ of container.stdout) {}

    expect(captured.length).toBeGreaterThan(0);
    expect(captured[0]).toContain('"type":"message"');
    // sendInput appends a newline
    expect(captured[0]).toMatch(/\n$/);
  });

  test("stop signals agent and ends the stream", async () => {
    const captured: string[] = [];

    // Create a stream that stays open until we close it
    const runtime = new CloudflareSandboxRuntime({
      getSandbox: () => {
        const encoder = new TextEncoder();
        return {
          async startProcess() {
            const stdout = new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(encoder.encode('{"type":"status","state":"thinking"}\n'));
                // Don't close — simulate long-running agent
              },
            });
            const stdin = new WritableStream<Uint8Array>({
              write(chunk) {
                captured.push(new TextDecoder().decode(chunk));
              },
            });
            return { stdout, stdin };
          },
        };
      },
    });

    const container = await runtime.spawn({
      name: "test",
      agent: "a",
      model: "m",
      task: "t",
    });

    // Give piping time to start
    await new Promise((r) => setTimeout(r, 50));

    await container.stop();

    // stop() should have sent a signal message to stdin
    expect(captured.some((c) => c.includes('"signal"'))).toBe(true);
  });

  test("sets correct environment variables", async () => {
    let capturedEnv: Record<string, string> | undefined;

    const runtime = new CloudflareSandboxRuntime({
      getSandbox: () => ({
        async startProcess(_cmd, opts) {
          capturedEnv = opts?.env;
          const stdout = new ReadableStream<Uint8Array>({
            start(c) { c.close(); },
          });
          return { stdout };
        },
      }),
    });

    await runtime.spawn({
      name: "test",
      agent: "claude-code",
      model: "claude-sonnet-4-20250514",
      task: "fix the bug",
      env: { CUSTOM_VAR: "custom-value" },
    });

    expect(capturedEnv).toBeDefined();
    expect(capturedEnv!.FILEPATH_TASK).toBe("fix the bug");
    expect(capturedEnv!.FILEPATH_AGENT_TYPE).toBe("claude-code");
    expect(capturedEnv!.FILEPATH_MODEL).toBe("claude-sonnet-4-20250514");
    expect(capturedEnv!.FILEPATH_WORKSPACE).toBe("/workspace");
    expect(capturedEnv!.CUSTOM_VAR).toBe("custom-value");
  });

  test("custom command override", async () => {
    let capturedCommand: string[] | undefined;

    const runtime = new CloudflareSandboxRuntime({
      getSandbox: () => ({
        async startProcess(cmd) {
          capturedCommand = cmd;
          const stdout = new ReadableStream<Uint8Array>({
            start(c) { c.close(); },
          });
          return { stdout };
        },
      }),
      command: (config) => ["my-agent", "--model", config.model, "--run"],
    });

    await runtime.spawn({
      name: "test",
      agent: "claude-code",
      model: "claude-sonnet-4-20250514",
      task: "task",
    });

    expect(capturedCommand).toEqual(["my-agent", "--model", "claude-sonnet-4-20250514", "--run"]);
  });

  test("default command uses config.agent", async () => {
    let capturedCommand: string[] | undefined;

    const runtime = new CloudflareSandboxRuntime({
      getSandbox: () => ({
        async startProcess(cmd) {
          capturedCommand = cmd;
          const stdout = new ReadableStream<Uint8Array>({
            start(c) { c.close(); },
          });
          return { stdout };
        },
      }),
    });

    await runtime.spawn({
      name: "test",
      agent: "codex",
      model: "m",
      task: "t",
    });

    expect(capturedCommand).toEqual(["codex"]);
  });
});

// ─── Integration: Runtime + Filepath Backend ───

describe("CloudflareSandboxRuntime + FilepathBackend integration", () => {
  test("end-to-end: runtime → container → backend → logs", async () => {
    const encoder = new TextEncoder();
    const events = [
      '{"type":"status","state":"thinking"}',
      '{"type":"tool","name":"read_file","path":"src/app.ts","status":"start"}',
      '{"type":"tool","name":"read_file","path":"src/app.ts","status":"done","output":"contents"}',
      '{"type":"commit","hash":"abc123","message":"fix: auth bug"}',
      '{"type":"done","summary":"Fixed the bug"}',
    ];

    const runtime = new CloudflareSandboxRuntime({
      getSandbox: () => ({
        async startProcess() {
          const stdout = new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(encoder.encode(events.join("\n") + "\n"));
              controller.close();
            },
          });
          return { stdout };
        },
      }),
    });

    const container = await runtime.spawn({
      name: "fix-agent",
      agent: "claude-code",
      model: "claude-sonnet-4-20250514",
      task: "Fix the auth bug",
    });

    const backend = createFilepathBackend(container, "fix-agent");
    const stream = await Effect.runPromise(backend.start());
    const logs: Log[] = [];
    for await (const log of stream) {
      logs.push(log);
    }

    expect(logs).toHaveLength(5);
    expect(logs[0].action).toBe("status");
    expect(logs[0].stage).toBe("fix-agent");
    expect(logs[1].action).toBe("tool:read_file");
    expect(logs[1].status).toBe("start");
    expect(logs[2].action).toBe("tool:read_file");
    expect(logs[2].status).toBe("success");
    expect(logs[3].action).toBe("commit");
    expect(logs[3].data?.hash).toBe("abc123");
    expect(logs[4].action).toBe("done");
    expect(logs[4].data?.summary).toBe("Fixed the bug");
  });

  test("executor + observe can both read from same container", async () => {
    const encoder = new TextEncoder();
    const events = [
      '{"type":"text","content":"working on it"}',
      '{"type":"commit","hash":"def456","message":"feat: new feature"}',
      '{"type":"done","summary":"All done"}',
    ];

    const runtime = new CloudflareSandboxRuntime({
      getSandbox: () => ({
        async startProcess() {
          const stdout = new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(encoder.encode(events.join("\n") + "\n"));
              controller.close();
            },
          });
          return { stdout };
        },
      }),
    });

    const container = await runtime.spawn({
      name: "test",
      agent: "a",
      model: "m",
      task: "t",
    });

    // Simulate executor draining stdout
    const executorLines: string[] = [];
    const executorPromise = (async () => {
      for await (const line of container.stdout) {
        executorLines.push(line);
      }
    })();

    // Simulate observe layer reading via backend
    const backend = createFilepathBackend(container, "test");
    const stream = await Effect.runPromise(backend.start());
    const observeLogs: Log[] = [];
    const observePromise = (async () => {
      for await (const log of stream) {
        observeLogs.push(log);
      }
    })();

    await Promise.all([executorPromise, observePromise]);

    // Both should see all events
    expect(executorLines).toHaveLength(3);
    expect(observeLogs).toHaveLength(3);
    expect(observeLogs[0].action).toBe("text");
    expect(observeLogs[1].action).toBe("commit");
    expect(observeLogs[2].action).toBe("done");
  });
});
