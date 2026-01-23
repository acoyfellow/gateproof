# gateproof

E2E testing harness. Observe logs, run actions, assert results.

## What gateproof does

gateproof **executes gates**. It does not define intent, plans, or workflows.

A gate is a test specification: observe logs, run actions, assert results. gateproof runs it and returns evidence.

You define stories (gates) in your PRD. gateproof executes gate files.

**Try one gate on one critical path.** If it reduces uncertainty, keep it. If it doesn't fit, delete it.

**Authority chain:**
- **PRD (`prd.ts`)** — authority on intent, order, and dependencies (if you use the PRD runner)
- **Gate implementations** — authority on how reality is observed
- **gateproof runtime** — authority on enforcement only

gateproof never decides *what* to build. It returns results; your CI/CD decides whether you are allowed to proceed.

## Stories as gates

A PRD (Product Requirements Document) defines stories. Stories are gates. Each story references a gate file. The gate file verifies the story against reality.

Reality is the source of truth; gates make it enforceable in CI.

### prd.ts example

```typescript
// prd.ts
import { definePrd } from "gateproof/prd";

export const prd = definePrd({
  stories: [
    {
      id: "user-signup",
      title: "User can sign up",
      gateFile: "./gates/user-signup.gate.ts",
    },
    {
      id: "email-verification",
      title: "User receives verification email",
      gateFile: "./gates/email-verification.gate.ts",
      dependsOn: ["user-signup"],
    },
  ],
});

// Make it executable
if (import.meta.main) {
  const { runPrd } = await import("gateproof/prd");
  const result = await runPrd(prd);
  if (!result.success) {
    if (result.failedStory) console.error(`Failed at: ${result.failedStory.id}`);
    process.exit(1);
  }
  process.exit(0);
}
```

Each story references a gate file. The gate file uses gateproof's API:

```typescript
// gates/user-signup.gate.ts
import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

export async function run() {
  const provider = CloudflareProvider({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    apiToken: process.env.CLOUDFLARE_API_TOKEN!,
  });

  const result = await Gate.run({
    name: "user-signup",
    observe: provider.observe({ backend: "analytics", dataset: "worker_logs" }),
    act: [Act.browser({ url: "https://app.example.com/signup" })],
    assert: [
      Assert.noErrors(),
      Assert.hasAction("user_created"),
    ],
  });

  return { status: result.status };
}
```

**gateproof does not own your PRD’s intent or state.** If you choose to use `gateproof/prd`, your PRD must match a small capsule shape (`stories[]` with `id/title/gateFile/dependsOn?`). Otherwise, orchestrate gates however you want — gateproof only cares about executing gate files.

Stories execute in dependency order. The runner stops on first failure. Progress is not declared. It is proven.

## How it works

The PRD defines stories. Stories reference gate files. Gate files use gateproof's API. Gates can be enforced in CI before merge/deploy.

The sequence: PRD story → gate file → gate execution → story marked "done" only when gate passes.

Run your PRD:

```bash
bun run prd.ts
```

## Hardening `prd.ts` (recommended)

Treat `prd.ts` like code: typecheck + validate before push + enforce in CI.

- **Validate PRD**:

```bash
bun run prd:validate
```

- **Pre-push (default for everyone on your team)**: add to your `prepush` script (Husky calls it).

```json
{
  "scripts": {
    "prepush": "bun run typecheck && bun run prd:validate && bun test"
  }
}
```

- **CI**: run the validator before running PRD/tests.

```yaml
- name: Validate PRD
  run: bun run prd:validate
```

- **Monorepo**: validate any PRD file by path.

```bash
bun run scripts/prd-validate.ts packages/api/prd.ts
```

## Design notes

- [Effect and Schema: Gateproof's Foundation](docs/effect-and-schema.md)

## Writing good gates (agent-first)

Gates can fail loudly. They can also pass on silence if you write weak assertions.

- **Always assert at least one positive signal**: `Assert.hasAction(...)` and/or `Assert.hasStage(...)`. If your backend can be silent, add an explicit “evidence must exist” custom assertion.
- **Don’t rely on absence-only checks**: `Assert.noErrors()` alone can pass if you collect no logs.
- **Treat observability as part of the system**: your confidence is bounded by what you can observe.

## Limits / Non-goals

- **Not a planner or orchestrator**: gateproof executes gates; your PRD (or CI) decides what to run and in what context.
- **Not a truth oracle**: if your backend drops logs, a gate can be wrong. Gateproof can’t fix missing telemetry.
- **Enforcement is external**: gateproof returns results; CI/CD decides whether to block merge/deploy.

## Common objections (and answers)

- **"Isn't this just E2E tests?"** Similar goal, different anchor. Gates are evidence-first (logs/telemetry + explicit assertions), not DOM-only. The contract is: observe → act → assert → evidence.

- **"What about flaky telemetry?"** Gates don't fix missing telemetry. They make the dependency explicit. If your backend drops logs, a gate can be wrong — but you'll know immediately, not in production.

- **"Isn't this overhead?"** It can be. The pitch isn't "gate everything." It's "gate the few transitions that are expensive to get wrong." Start with one critical path.

- **"Will this lock us in?"** Gates are just TypeScript files. If you stop using gateproof, you keep the scripts and the intent. No vendor lock-in.

## Quick Start

The API is minimal: three concepts (Gate, Act, Assert). Here's a gate:

```typescript
import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

const provider = CloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken: process.env.CLOUDFLARE_API_TOKEN!,
});

const result = await Gate.run({
  name: "api-health-check",
  observe: provider.observe({ backend: "analytics", dataset: "worker_logs" }),
  act: [Act.browser({ url: "https://my-worker.workers.dev" })],
  assert: [Assert.noErrors(), Assert.hasAction("request_received")],
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

## PRD Runner

gateproof provides a PRD runner that executes stories in dependency order:

```typescript
import { definePrd, runPrd } from "gateproof/prd";

const prd = definePrd({
  stories: [
    {
      id: "story-1",
      title: "First story",
      gateFile: "./gates/story-1.gate.ts",
    },
    {
      id: "story-2",
      title: "Second story",
      gateFile: "./gates/story-2.gate.ts",
      dependsOn: ["story-1"],
    },
  ],
});

const result = await runPrd(prd);
if (!result.success) {
  console.error(`Failed at: ${result.failedStory?.id}`);
  process.exit(1);
}
```

The runner:
- Validates dependencies (unknown IDs and cycles throw)
- Topologically sorts stories by `dependsOn`
- Executes gates in order
- **Stops on first failure**

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
- `patterns/prd/` - PRD-as-code examples

## CI/CD

gateproof enforces gates in CI/CD. See `patterns/ci-cd/github-actions.ts` for examples.

Run your PRD in CI:

```yaml
- name: Run PRD
  run: bun run prd.ts
```

## Requirements

- Node.js 18+ or Bun
- `playwright` (optional, for Act.browser)
- Cloudflare credentials (for CloudflareProvider, or bring your own backend)

## License

MIT
