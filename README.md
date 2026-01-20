# gateproof

E2E testing harness. Observe logs, run actions, assert results.

**Minimal surface area. Maximum power.**

## Agent-First Contract (AX)

gateproof is built for agents first, humans second. The interface is intentionally tiny so it fits in an agent’s working context: **Gate** (spec), **Act** (side effects), **Assert** (truth checks).

**Promise: test against reality.** An agent can run a gate against live observability data and receive verifiable evidence that the system behaved as intended. No mocks, no guesses—real logs, real actions, real proof.

### What agents want from the contract
- **Small, stable vocabulary**: Gate.run(spec) with explicit `observe`, `act`, `assert`.
- **Deterministic IO**: actions are the only side effects; assertions are pure.
- **Evidence over prose**: logs plus summarized evidence so context stays short.
- **Clear failure modes**: timeouts, assertion failures, and observability errors are distinct.
- **Composability**: gates can be chained as checkpoints in a plan.

## Quick Start

```typescript
import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

const provider = CloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken: process.env.CLOUDFLARE_API_TOKEN!
});

const result = await Gate.run({
  observe: provider.observe({ backend: "analytics", dataset: "worker_logs" }),
  act: [Act.browser({ url: "https://my-worker.workers.dev" })],
  assert: [Assert.noErrors(), Assert.hasAction("request_received")]
});

if (result.status !== "success") process.exit(1);
```

That's it. Three concepts: **Gate**, **Act**, **Assert**.

## Core API

### Gate.run(spec)
Run a gate. Returns a result with status, logs, and evidence.
`spec.name` is optional metadata for labeling a gate.

### Actions
```typescript
Act.exec("command")              // Run shell command
Act.browser({ url, headless? })  // Browser automation (needs playwright)
Act.wait(ms)                     // Sleep
Act.deploy({ worker })           // Deploy marker
```

### Assertions
```typescript
Assert.noErrors()                // No error logs
Assert.hasAction("name")         // Action was logged
Assert.hasStage("worker")        // Stage was seen
Assert.custom("name", fn)        // Custom: (logs) => boolean
```

### Result
```typescript
{
  status: "success" | "failed" | "timeout",
  durationMs: number,
  logs: Log[],
  evidence: {
    requestIds: string[],
    stagesSeen: string[],
    actionsSeen: string[],
    errorTags: string[]
  },
  error?: Error
}
```

### Agent-friendly prompt snippet
```typescript
// Given a requirement, define the gate that proves it against reality.
const gate = {
  name: "agent-verified",
  observe: provider.observe({ backend: "analytics", dataset: "worker_logs" }),
  act: [Act.browser({ url })],
  assert: [Assert.noErrors(), Assert.hasAction("request_received")]
};
const result = await Gate.run(gate);
if (result.status !== "success") throw result.error;
```

## Plug Your Backend

gateproof works with any observability backend. Just implement the `Backend` interface:

```typescript
interface Backend {
  start(): Effect.Effect<LogStream, ObservabilityError>;
  stop(): Effect.Effect<void, ObservabilityError>;
}
```

See `patterns/` for examples including:
- Cloudflare Analytics Engine
- Cloudflare Workers Logs API
- CLI Stream (local dev)
- Custom backends

## Cloudflare Backends

```typescript
const provider = CloudflareProvider({ accountId, apiToken });

// Analytics Engine (recommended)
provider.observe({ backend: "analytics", dataset: "worker_logs" })

// Workers Logs API
provider.observe({ backend: "workers-logs", workerName: "my-worker" })

// CLI Stream (local dev)
provider.observe({ backend: "cli-stream", workerName: "my-worker" })
```

## Examples

See `patterns/` for complete examples:
- `patterns/basic/` - Basic usage patterns
- `patterns/cloudflare/` - Cloudflare-specific patterns
- `patterns/ci-cd/` - CI/CD integration
- `patterns/advanced/` - Advanced patterns

## CI/CD

gateproof works great in CI/CD. See `patterns/ci-cd/github-actions.ts` for examples.

## Common Questions

**How is this different from Playwright?**
- Playwright validates UI behavior. gateproof validates production logs. Your API might return 200 but log errors—Playwright won't catch that.

**How is this different from Jest/Vitest?**
- Jest validates code logic with mocks. gateproof validates production reality with real observability data.

**How is this different from integration tests?**
- Integration tests run in test environments with test data. gateproof runs against production/staging with real observability backends.

**How is this different from monitoring/alerting?**
- Monitoring tells you something broke. gateproof prevents you from deploying broken code in the first place.

**When should I use gateproof?**
- Post-deploy validation, AI-generated code validation, pre-merge checks, or any time you need to validate against production observability data.

## Requirements

- Node.js 18+ or Bun
- `playwright` (optional, for Act.browser)
- Cloudflare credentials (for CloudflareProvider, or bring your own backend)

## Why gateproof?

Normal tests check code logic. gateproof checks production reality.

Tests pass, deploy succeeds, production breaks. Why? Tests validate code in isolation, not the system in reality.

gateproof validates against **real observability data** from your production system. It's the missing layer between "code works in test" and "code works in production."

If you've deployed code that passed all tests but broke in production, gateproof solves that.

## Philosophy

### Where Two Worlds Collide

There's a tension: move fast vs. validate everything. Both are necessary. gateproof is where both work together.

You can move fast AND have proof. You can iterate quickly AND validate against production. Gates are the bridge.

### Gates as Deterministic Paths

Gates are **deterministic, provable paths**. They're not just tests—they're the specification itself.

**Traditional**: Write code → Write tests → Hope it works in production

**Gate-driven**: Define gates → Build to pass through them → Prove it works

Think of it like a PRD or task list, but executable and provable. You can't proceed to the next step until the current gate passes. Each gate is a checkpoint. Each gate is proof.

The plan creator defines the gates. The builder must pass through them. The gates are the specification, the validation, and the proof—all in one.

## License

MIT
