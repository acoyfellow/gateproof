# Filepath ↔ Gateproof Integration Prompt

## Context

Gateproof is an observe→act→assert testing framework for AI agents. It watches
NDJSON event streams from agent containers, collects structured logs, and runs
assertions (including authority/governance policies) against them.

We need a **real `FilepathRuntime` implementation** — the piece that actually
spawns a container, runs an agent inside it, and exposes its stdout as an
`AsyncIterable<string>`.

Everything else is done. The types, protocol, mock, observer, assertions, and
PRD runner all work. 209 tests pass. The only gap is the real container spawn.

---

## The Interface To Implement

```typescript
// gateproof expects you to implement this:
interface FilepathRuntime {
  spawn(config: AgentActConfig): Promise<FilepathContainer>;
}

interface FilepathContainer {
  /** NDJSON line stream from the container's stdout */
  stdout: AsyncIterable<string>;
  /** Send an NDJSON message to the container's stdin */
  sendInput(line: string): Promise<void>;
  /** Stop the container */
  stop(): Promise<void>;
}

interface AgentActConfig {
  name: string;          // Display name
  agent: string;         // "claude-code" | "codex" | "cursor" | docker image
  model: string;         // "claude-sonnet-4-20250514", "gpt-4o", etc.
  task: string;          // Natural language task (set as FILEPATH_TASK env var)
  repo?: string;         // Git repo to clone into /workspace
  env?: Record<string, string>;  // Extra env vars
  timeoutMs?: number;    // Default 300_000 (5 min)
}
```

Registration:

```typescript
import { setFilepathRuntime } from "gateproof";
setFilepathRuntime(yourRuntime);
```

---

## NDJSON Protocol (stdout → gateproof)

The container must emit one JSON object per line on stdout. Gateproof parses
these with Zod schemas. Supported event types:

| type        | key fields                                       |
|-------------|--------------------------------------------------|
| `text`      | `content: string`                                |
| `tool`      | `name, path?, status: "start"|"done"|"error"`    |
| `command`   | `cmd, status, exit?, stdout?, stderr?`            |
| `commit`    | `hash, message`                                  |
| `spawn`     | `name, agent, model`                             |
| `workers`   | `workers: [{name, status, context_pct?}]`        |
| `status`    | `state: "thinking"|"idle"|"error", context_pct?` |
| `handoff`   | `summary: string`                                |
| `done`      | `summary: string`                                |

Example stream:

```ndjson
{"type":"status","state":"thinking"}
{"type":"tool","name":"read_file","path":"src/app.ts","status":"start"}
{"type":"tool","name":"read_file","path":"src/app.ts","status":"done","output":"..."}
{"type":"tool","name":"write_file","path":"src/app.ts","status":"done"}
{"type":"command","cmd":"npm test","status":"done","exit":0,"stdout":"5 passed"}
{"type":"commit","hash":"abc123","message":"fix: null check"}
{"type":"done","summary":"Fixed the bug, tests pass."}
```

---

## stdin (gateproof → container)

Gateproof can optionally send messages to the container via `sendInput()`:

```json
{"type":"message","from":"user","content":"focus on auth module only"}
{"type":"signal","action":"stop"}
```

---

## What spawn() Must Do

1. Start an isolated environment (Docker, VM, Firecracker, whatever)
2. Clone `config.repo` into `/workspace` (if provided)
3. Set `FILEPATH_TASK=config.task` in the container's environment
4. Set any `config.env` vars
5. Start the agent process (`config.agent` + `config.model`)
6. Pipe the agent's NDJSON stdout into an `AsyncIterable<string>` (line-buffered)
7. Wire `sendInput()` to the agent's stdin
8. Wire `stop()` to gracefully terminate (SIGTERM → SIGKILL after timeout)

---

## Known Integration Issue: stdout tee

Both gateproof's **executor** and **observe layer** need to read `container.stdout`.
An `AsyncIterable` can only be consumed once. The real runtime should either:

- **Option A**: Tee the stream internally (return a broadcast iterable)
- **Option B**: Emit to an in-memory buffer that supports multiple readers
- **Option C**: Use a `ReadableStream` with `.tee()` (Web Streams API)

The mock sidesteps this by pushing events into an Effect Queue that both sides
can read. The real implementation needs to solve this for concurrent consumption.

---

## How Gateproof Uses It (end-to-end)

```typescript
import { Gate, Act, Assert } from "gateproof";
import { setFilepathRuntime } from "gateproof";
import { YourRuntime } from "./your-filepath-runtime";

setFilepathRuntime(new YourRuntime());

await Gate.run({
  name: "fix-auth-bug",
  observe: filepathObserve,        // reads container.stdout → Log[]
  act: [
    Act.agent({
      name: "fixer",
      agent: "claude-code",
      model: "claude-sonnet-4-20250514",
      task: "Fix the null pointer in src/auth.ts",
      repo: "https://github.com/org/repo",
    }),
  ],
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
```

---

## Reference Files

- `src/filepath-backend.ts` — interfaces, mock, observe resource factory
- `src/filepath-protocol.ts` — NDJSON Zod schemas, event→log mapping
- `src/action-executors.ts` — agent executor, `setFilepathRuntime()`
- `src/act.ts` — `AgentActConfig` type
- `test/filepath-backend.test.ts` — mock container tests (good conformance spec)
- `test/agent-action.test.ts` — executor tests
- `patterns/agent-first/agent-gate.ts` — working integration example with mock

---

## Questions for You

1. What container runtime are you using? (Docker, Firecracker, E2B, Fly Machines, etc.)
2. How do you want to handle the stdout tee problem? (Option A/B/C above, or something else?)
3. Does the agent process itself speak NDJSON natively, or do you need an adapter shim between the agent's output format and the protocol above?
4. Should `stop()` be graceful (SIGTERM + grace period) or immediate?
5. Any auth/credential injection beyond env vars? (e.g., mounting secrets, OAuth token forwarding)
