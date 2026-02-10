# How to Use Shorthands

> Contributed by @grok

Goal: write gates with less boilerplate using the optional shorthands module.

## Import

```ts
import {
  gate, commandGate, browserGate,
  noErrors, hasAction, hasStage, custom,
  browserAct, execAct, cloudflare, emptyObserve,
  hasAnyEvidence, hasMinLogs, allOf, anyOf, not,
} from "gateproof/shorthands";
```

## gate() — simplified Gate.run

The `gate()` function wraps `Gate.run` with sensible defaults. `observe` defaults to empty, and `act`/`assert` accept single items or arrays.

```ts
const result = await gate("health-check", {
  act: execAct.run("curl -f http://localhost:8787/api/health"),
  assert: noErrors(),
});

if (result.status !== "success") process.exit(1);
```

## commandGate() — run a command and check exit code

For build/test gates that don't need log observation:

```ts
const result = await commandGate("build", "bun run build");
```

```ts
const result = await commandGate("test", "bun test", { cwd: "./app" });
```

## browserGate() — navigate and assert

```ts
const result = await browserGate("homepage", "https://app.example.com", {
  observe: cloudflare.logs({ dataset: "worker_logs" }),
  assert: [hasAction("page_loaded"), noErrors()],
});
```

## Flat assertions

Instead of `Assert.noErrors()`, use the flat equivalents:

| Shorthand | Equivalent |
|-----------|-----------|
| `noErrors()` | `Assert.noErrors()` |
| `hasAction("name")` | `Assert.hasAction("name")` |
| `hasStage("stage")` | `Assert.hasStage("stage")` |
| `custom("name", fn)` | `Assert.custom("name", fn)` |
| `hasAnyEvidence()` | Custom: any action or stage in logs |
| `hasMinLogs(n)` | Custom: at least N log entries |
| `hasLogWith(field, value)` | Custom: log with specific field value |

## Assertion combinators

Combine assertions with logic operators:

```ts
// All must pass (same as passing an array)
assert: allOf(hasAction("created"), noErrors())

// At least one must pass
assert: anyOf(hasAction("created"), hasAction("updated"))

// Negate an assertion
assert: not(hasStage("error_stage"))
```

## Action helpers

```ts
// Browser actions
browserAct.goto("https://example.com")
browserAct.gotoVisible("https://example.com")  // headless: false

// Command execution
execAct.run("curl http://localhost:8787")
execAct.npm("test")
execAct.bun("build")
```

## Cloudflare observe helpers

Auto-reads `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` from env:

```ts
// Analytics Engine
observe: cloudflare.logs({ dataset: "worker_logs" })

// Workers Logs API
observe: cloudflare.workersLogs({ workerName: "my-worker" })

// CLI stream (local dev)
observe: cloudflare.cliStream()
```

## Full example

```ts
import {
  gate, noErrors, hasAction, browserAct, cloudflare,
} from "gateproof/shorthands";

const result = await gate("user-signup", {
  observe: cloudflare.logs({ dataset: "worker_logs" }),
  act: browserAct.goto("https://app.example.com/signup"),
  assert: [noErrors(), hasAction("user_created")],
});

if (result.status !== "success") process.exit(1);
```

Compare with the full API equivalent:

```ts
import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

const provider = CloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken: process.env.CLOUDFLARE_API_TOKEN!,
});

const result = await Gate.run({
  name: "user-signup",
  observe: provider.observe({ backend: "analytics", dataset: "worker_logs" }),
  act: [Act.browser({ url: "https://app.example.com/signup" })],
  assert: [Assert.noErrors(), Assert.hasAction("user_created")],
});

if (result.status !== "success") process.exit(1);
```

## Related

- Reference: `docs/reference/api.md`
- How-to: `docs/how-to/add-a-gate.md`
