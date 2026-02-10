# gateproof

Software is built in reverse. You know what you want before you know how to get there. TDD proved the idea: write the test first, then make it pass. Gateproof takes the next step.

Write stories. Attach gates. Let agents iterate until reality matches intent.

A **gate** observes real evidence (logs, telemetry), acts (browser, shell, deploy), and asserts outcomes. A **story** is a gate with a name and a place in a plan. A **prd.ts** is a list of stories in dependency order. The agent's only job is to make the next failing gate pass.

## The thesis

Plans are solid. Implementation is liquid.

Any codebase can be scoped down to stories and a `prd.ts`. Multiple agents can work the same plan, falling through the same checkpoints. Once a gate passes, previous work can't break -- the gate proves it. The skill shifts from writing code to defining the right guardrails.

Gates are checkpoints that keep agents safe. They don't decide intent. They verify reality.

## Install

```bash
bun add gateproof
```

## Minimal gate

```ts
import { Gate, Act, Assert } from "gateproof";

const result = await Gate.run({
  name: "post-deploy",
  observe: createHttpObserveResource({
    url: "https://api.example.com/health",
  }),
  act: [Act.wait(500)],
  assert: [Assert.noErrors()],
  stop: { maxMs: 10_000 },
});

if (result.status !== "success") process.exit(1);
```

## Stories + PRD

```ts
import { definePrd, runPrd } from "gateproof/prd";

const prd = definePrd({
  stories: [
    {
      id: "user-signup",
      title: "User can sign up with email",
      gateFile: "./gates/signup.gate.ts",
    },
    {
      id: "email-verification",
      title: "User receives verification email",
      gateFile: "./gates/verify.gate.ts",
      dependsOn: ["user-signup"],
    },
  ] as const,
});

const result = await runPrd(prd);
if (!result.success) process.exit(1);
```

## The loop

Gate fails. Agent reads the failure evidence. Agent fixes code. Gate re-runs. Loop until pass.

```ts
import { runPrdLoop, createOpenCodeAgent } from "gateproof/prd";

await runPrdLoop("./prd.ts", {
  agent: createOpenCodeAgent({ apiKey: process.env.OPENCODE_ZEN_API_KEY }),
  maxIterations: 7,
});
```

## Generate a PRD from plain language

```bash
echo "Build a signup flow with email verification" | npx gateproof prdts --stdout
```

## Docs

Full documentation, tutorials, and API reference: [gateproof.dev/docs](https://gateproof.dev/docs)

**The iteration loop:**
1. Run PRD → executes gates in dependency order
2. Gate fails → agent gets: codebase context (e.g., `AGENTS.md`) + failure output
3. Agent fixes → makes changes to codebase
4. Loop repeats → re-run PRD, check if gates pass
5. All gates pass → done

**Why minimal context:**
- Agent starts with PRD only (no full codebase upfront)
- Agent gets context only when gates fail (just-in-time)
- PRD stays as authority (what to build)
- Gates provide concrete feedback (what's wrong)

**Example loop script:**
```bash
# patterns/prd/agent-iteration-loop.sh
while true; do
  bun run prd.ts || {
    # Gate failed - agent gets PRD + failure output
    agent --context prd.ts --failure "$(cat gate-output.txt)"
    # Agent fixes, loop continues
  }
  break  # All gates passed
done
```

**The guardrails:**
- Max failures (default: 5) → auto-pause if stuck
- Git diff check → agent must make changes
- Pause file → manual control

This solves the context management problem: agents don't need full codebase context upfront. They get minimal context (PRD), concrete feedback (gate failures), and iterate until correct.

## Anatomy of a prd.ts (1 list)

1. **Instructions**: each story title encodes behavior + evidence + scope (the agent's marching orders).
2. **Stories**: `stories[]` holds `{ id, title, gateFile, dependsOn?, progress? }` in execution order.
3. **Gates**: `gateFile` points at a gate script that observes logs, acts, and asserts evidence.
4. **Loop state**: `runPrd(...)` returns success or the `failedStory` plus gate evidence (actions/stages/errors).
5. **Loop instructions**: on failure, feed the agent `prd.ts` + gate output, fix code, re-run PRD until pass.

## Agent-First PRD Structure

This is an **agent-first library**. PRD.ts isn't just documentation—it's the executable contract agents work from.

### Why agents love `prd.ts`:

| Traditional PRD | Agent-First PRD |
|----------------|-----------------|
| Prose descriptions | Structured TypeScript |
| Human workflows | Parallel execution |
| Vague goals | Deterministic outcomes |
| Manual verification | Automated gates |
| Happy path only | Edge cases built-in |
| Text files only | Executable with `bun run prd.ts` |

### Agent benefits (what you want):

**✅ Deterministic outcomes with clear success criteria**
- Every story title encodes: what to do + evidence of completion
- No ambiguity about "done"
- Gates verify, not opinions

**⚡ Parallelizable operations**
- Stories can run independently (except `dependsOn`)
- Agents don't wait for humans
- Context only when gates fail

**🧪 Testable by default**
- Gate files are test specifications
- Observe logs, act, assert results
- Evidence provided automatically

**🔄 Automatic error recovery**
- Gate failures → concrete feedback
- `runPrd()` returns `failedStory` + evidence
- Loop until pass

**🛡️ Safety guarantees**
- `scope.allowedPaths` / `maxChangedLines` prevent scope creep
- TypeScript literal types prevent typos
- Agent execution confined to agreed bounds

**📍 Progress checkpoints**
- `progress[]` array provides milestones
- Agents know what's accomplished
- No "is this done?" debates

### What's in a story:

```typescript
{
  id: "user-signup",           // Unique, type-safe literal
  title: "User can sign up",    // What + evidence + scope
  gateFile: "./gates/signup.gate.ts",  // Verifier
  dependsOn: [],               // Dependencies (execution order)
  scope: {                    // Guardrails (optional)
    allowedPaths: ["src/routes/", "src/lib/"],
    maxChangedFiles: 5,
    maxChangedLines: 200,
  },
  progress: [                 // Checkpoints (optional)
    "signup_page_live",
    "user_created"
  ]
}
```

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
      progress: ["signup_page_live", "user_created"],
    },
    {
      id: "email-verification",
      title: "User receives verification email",
      gateFile: "./gates/email-verification.gate.ts",
      dependsOn: ["user-signup"],
      progress: ["email_sent", "verification_link_valid"],
    },
  ] as const, // keep story IDs as literal types
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

**gateproof does not own your PRD’s intent or state.** If you choose to use `gateproof/prd`, your PRD must match a small capsule shape (`stories[]` with `id/title/gateFile/dependsOn?/progress?`). The optional `progress` list is for your own tracking (or agent guidance); gateproof does not interpret or mutate it. Otherwise, orchestrate gates however you want — gateproof only cares about executing gate files.

Stories execute in dependency order. The runner stops on first failure. Progress is not declared. It is proven.

## How it works

The PRD defines stories. Stories reference gate files. Gate files use gateproof's API. Gates can be enforced in CI before merge/deploy.

**The sequence:** PRD story → gate file → gate execution → story marked "done" only when gate passes.

**For agent iterations:** PRD → gate fails → agent fixes → gate re-runs → loop until pass.

Run your PRD:

```bash
bun run prd.ts
```

Run agent iteration loop:

```bash
bash patterns/prd/agent-iteration-loop.sh
```

## Standalone loop (OpenCode Zen)

If you want a self-contained loop (agent fixes until all gates pass), run:

```bash
bun run prd:loop --prompt "Describe what to build"
```

This generates `prd.ts` if missing, runs it, and iterates until all stories pass.
Set `OPENCODE_ZEN_API_KEY` (and optionally `--model` / `--endpoint`).

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
  ] as const, // keep story IDs as literal types
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
- `patterns/prd/` - PRD-as-code + agent iteration loop examples
- `patterns/agent-first/` - Spec interview → PRD stories (agent-first)
- `examples/hello-world-agent/` - Minimal agent with 5 tools + end-to-end gates

Run the hello-world agent example (requires `OPENCODE_ZEN_API_KEY` and network access to `opencode.ai`):

```bash
export OPENCODE_ZEN_API_KEY="your_key_here"
bun run examples/hello-world-agent/prd.ts
```

## CI/CD

gateproof enforces gates in CI/CD. See `patterns/ci-cd/github-actions.ts` for examples.

Run your PRD in CI:

```yaml
- name: Run PRD
  run: bun run prd.ts
```

## Experimental / Optional Enhancements

These features are **additive and optional**. All existing APIs, CLI commands, and patterns work unchanged.

### Native PRD Loop (`runPrdLoop`)

Run the retry loop natively from TypeScript without bash orchestration:

```typescript
import { runPrdLoop, createOpenCodeAgent } from "gateproof/prd";

const result = await runPrdLoop("./prd.ts", {
  maxIterations: 7,
  agent: async (ctx) => {
    // ctx.prdSlice - relevant story details
    // ctx.failureSummary - what failed and why
    // ctx.recentDiff - recent git changes
    console.log(`Fixing: ${ctx.failedStory?.id}`);
    // Make fixes...
    return { changes: ["Fixed validation bug"], commitMsg: "fix: validation" };
  },
  onIteration: (status) => {
    console.log(`Attempt ${status.attempt}: ${status.passed ? "PASS" : "FAIL"}`);
  },
  autoCommit: true,  // auto-commit after agent changes
  writeEvidenceLog: true,  // append to .gateproof/evidence.log
});

// Or use the built-in OpenCode agent:
const agent = createOpenCodeAgent({ apiKey: process.env.OPENCODE_ZEN_API_KEY });
await runPrdLoop("./prd.ts", { agent });
```

### Shorthands Module

Flatter, more ergonomic helpers for defining gates:

```typescript
import {
  gate,
  cloudflare,
  browserAct,
  execAct,
  noErrors,
  hasAction,
  hasAnyEvidence,
  commandGate,
} from "gateproof/shorthands";

// Simple command gate
const buildResult = await commandGate("build", "npm run build");

// Full gate with shorthands
const result = await gate("user-signup", {
  observe: cloudflare.logs({ dataset: "worker_logs" }),  // auto-uses env vars
  act: browserAct.goto("https://app.example.com/signup"),
  assert: [noErrors(), hasAction("user_created")],
});

// Assertion helpers
hasAnyEvidence()           // At least one action or stage logged
hasMinLogs(5)              // At least 5 log entries
hasLogWith("userId", "123") // Specific field value
anyOf(hasAction("a"), hasAction("b"))  // OR logic
not(hasAction("error"))    // Negation
```

### Smoke Mode CLI

Validate gates once without agent iteration (great for debugging setup):

```bash
npx gateproof smoke ./prd.ts
npx gateproof smoke ./prd.ts --check-scope --json
```

### Positive Signal Requirement

Auto-fail gates that collect no evidence:

```typescript
{
  id: "critical-flow",
  title: "Payment processes successfully",
  gateFile: "./gates/payment.gate.ts",
  requirePositiveSignal: true,  // Fail if no actions/stages observed
}
```

### Scope Defaults & Guards

Smart scope inference based on project structure:

```typescript
import { inferScopeDefaults, getScopeDefaults, DEFAULT_FORBIDDEN_PATHS } from "gateproof/prd";

// Auto-detect source directories and forbidden paths
const defaults = inferScopeDefaults(process.cwd());
console.log(defaults.allowedPaths);   // ["src/", "app/", "components/"]
console.log(defaults.forbiddenPaths); // ["node_modules/", ".git/", "dist/", ...]

// Or load from .gateproof/scope.defaults.json
const customDefaults = getScopeDefaults();
```

Default forbidden paths: `node_modules/`, `.git/`, `dist/`, `build/`, `.next/`, `.env`, lock files.

### LLM-Friendly Failure Output

Structured failure summaries optimized for AI agents:

```typescript
import { createLLMFailureSummary, formatLLMFailureSummary } from "gateproof";

const summary = createLLMFailureSummary(report, {
  diffSnippet: gitDiff,
  logs: gateResult.logs,
});

// JSON structure with: summary, failedAssertions, evidence, suggestions
console.log(JSON.stringify(summary, null, 2));

// Or as formatted string block
console.log(formatLLMFailureSummary(summary));
```

### Agent Guidelines (`AGENTS.md`)

The repo includes `AGENTS.md` with prompt tips for AI agents:
- Read `prd.ts` first
- Respect scope constraints
- Fix one failing story at a time
- Make minimal diffs

## Requirements

- Node.js 18+ or Bun
- `playwright` (optional, for Act.browser)
- Cloudflare credentials (for CloudflareProvider, or bring your own backend)

## License

MIT
