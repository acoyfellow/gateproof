# How to Run an Agent Gate

Goal: spawn an AI agent in an isolated container, observe its NDJSON event stream, and assert governance policies against its behavior.

## Prerequisites

- A Cloudflare account with Sandbox access (`@cloudflare/sandbox`)
- An agent that emits NDJSON on stdout (e.g., Claude Code, Codex)

## 1. Set up the container runtime

```ts
import { setFilepathRuntime, CloudflareSandboxRuntime } from "gateproof";
import { getSandbox } from "@cloudflare/sandbox";

setFilepathRuntime(new CloudflareSandboxRuntime({
  getSandbox: (config) => getSandbox(env.Sandbox, `agent-${config.name}-${Date.now()}`),
}));
```

This registers the runtime globally. Call it once at startup.

## 2. Spawn and observe

```ts
import { createFilepathObserveResource } from "gateproof";

const container = await runtime.spawn({
  name: "fix-auth",
  agent: "claude-code",
  model: "claude-sonnet-4-20250514",
  task: "Fix the null pointer in src/auth.ts",
  env: { FILEPATH_API_KEY: process.env.API_KEY },
});

const observe = createFilepathObserveResource(container, "fix-auth");
```

The container's stdout is automatically parsed as NDJSON lines. Each event becomes a structured `Log` entry.

## 3. Run the gate with authority assertions

```ts
import { Gate, Act, Assert } from "gateproof";

const result = await Gate.run({
  name: "fix-auth-bug",
  observe,
  act: [Act.wait(300_000)],
  assert: [
    Assert.noErrors(),
    Assert.hasAction("commit"),
    Assert.hasAction("done"),
    Assert.authority({
      canCommit: true,
      canSpawn: false,
      forbiddenTools: ["delete_file"],
    }),
  ],
  stop: { idleMs: 5000, maxMs: 300_000 },
});

if (result.status !== "success") process.exit(1);
```

`Assert.authority()` checks the agent's actual behavior against the policy:

- **canCommit**: Did the agent commit? If `false` and a commit was observed, the gate fails.
- **canSpawn**: Did the agent spawn child agents? If `false` and a spawn was observed, the gate fails.
- **forbiddenTools**: Did the agent call any forbidden tools? If so, the gate fails.

## NDJSON event types

The agent must emit one JSON object per line on stdout:

| type | key fields |
|------|-----------|
| `text` | `content` |
| `tool` | `name`, `path?`, `status: "start"\|"done"\|"error"` |
| `command` | `cmd`, `status`, `exit?`, `stdout?`, `stderr?` |
| `commit` | `hash`, `message` |
| `spawn` | `name`, `agent`, `model` |
| `status` | `state: "thinking"\|"idle"\|"error"` |
| `done` | `summary` |

## Testing with the mock container

For unit tests, use the mock instead of a real container:

```ts
import { createMockFilepathContainer, createFilepathObserveResource } from "gateproof";

const container = createMockFilepathContainer();
const observe = createFilepathObserveResource(container, "test-agent");

// Simulate agent behavior
container.emit({ type: "text", content: "working on it" });
container.emit({ type: "commit", hash: "abc123", message: "fix: auth bug" });
container.emit({ type: "done", summary: "Fixed" });
container.done();

const result = await Gate.run({
  observe,
  act: [Act.wait(50)],
  assert: [Assert.hasAction("commit"), Assert.noErrors()],
  stop: { idleMs: 1000, maxMs: 5000 },
});
```

## Sending input to the agent

Use `container.sendInput()` to send NDJSON messages to the agent's stdin:

```ts
await container.sendInput(JSON.stringify({
  type: "message",
  from: "user",
  content: "focus on the auth module only",
}));
```

## Related

- Reference: `docs/reference/api.md`
- Explanation: `docs/explanations/overview.md`
- Pattern: `patterns/agent-first/agent-gate.ts`
