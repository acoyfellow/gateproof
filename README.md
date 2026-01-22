# gateproof

E2E testing harness. Observe logs, run actions, assert results.

## What gateproof does

gateproof **executes gates**. It does not define intent, plans, or workflows.

A gate is a test specification: observe logs, run actions, assert results. gateproof runs it and returns evidence.

You define stories (gates) in your PRD. gateproof executes gate files.

**Authority chain:**
- **PRD (`prd.ts` / `prd.json`)** — authority on intent, order, and state
- **Gate implementations** — authority on how reality is observed
- **gateproof runtime** — authority on enforcement only

gateproof never decides *what* to build. It only decides *when you are allowed to proceed*.

## Stories as gates

A PRD (Product Requirements Document) defines stories. Stories are gates. Each story references a gate file. The gate file verifies the story against reality.

Reality decides when you can proceed.

### prd.ts example

```typescript
// prd.ts
export const stories = [
  {
    id: "user-signup",
    title: "User can sign up",
    gateFile: "./gates/user-signup.gate.ts",
    status: "pending"
  },
  {
    id: "email-verification",
    title: "User receives verification email",
    gateFile: "./gates/email-verification.gate.ts",
    dependsOn: ["user-signup"],
    status: "pending"
  }
];
```

Each story references a gate file. The gate file uses gateproof's API:

```typescript
// gates/user-signup.gate.ts
import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

const provider = CloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken: process.env.CLOUDFLARE_API_TOKEN!
});

const result = await Gate.run({
  name: "user-signup",
  observe: provider.observe({ backend: "analytics", dataset: "worker_logs" }),
  act: [Act.browser({ url: "https://app.example.com/signup" })],
  assert: [
    Assert.noErrors(),
    Assert.hasAction("user_created")
  ]
});

if (result.status !== "success") process.exit(1);
```

### prd.json example

```json
{
  "stories": [
    {
      "id": "user-signup",
      "title": "User can sign up",
      "gateFile": "./gates/user-signup.gate.ts",
      "status": "pending"
    }
  ]
}
```

**gateproof does not parse or own your PRD.** It's your repo's artifact. **You decide the format. gateproof only executes the gate files your PRD references.**

Stories carry state. The PRD tracks which stories are pending, in progress, or done. gateproof does not manage this state. It only enforces: proceed only when gates pass.

## How it works

The PRD defines stories. Stories reference gate files. Gate files use gateproof's API. Gates can be enforced in CI before merge/deploy.

The sequence: PRD story → gate file → gate execution → story marked "done" only when gate passes.

Progress is not declared. It is proven.

## Quick Start

The API is minimal: three concepts (Gate, Act, Assert). Here's a gate:

```typescript
import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

const provider = CloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken: process.env.CLOUDFLARE_API_TOKEN!
});

const result = await Gate.run({
  name: "api-health-check",
  observe: provider.observe({ backend: "analytics", dataset: "worker_logs" }),
  act: [Act.browser({ url: "https://my-worker.workers.dev" })],
  assert: [Assert.noErrors(), Assert.hasAction("request_received")]
});

if (result.status !== "success") process.exit(1);
```

This gate is a story verification. The PRD points at it.

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

// Analytics Engine
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

gateproof enforces gates in CI/CD. See `patterns/ci-cd/github-actions.ts` for examples.

## Requirements

- Node.js 18+ or Bun
- `playwright` (optional, for Act.browser)
- Cloudflare credentials (for CloudflareProvider, or bring your own backend)


## License

MIT
