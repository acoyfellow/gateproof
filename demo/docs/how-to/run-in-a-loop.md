# How to Run Gates in a Loop

Goal: iterate on code until all gates pass, with an optional agent making fixes between attempts.

## Basic loop

```ts
import { runPrdLoop } from "gateproof/prd";

const result = await runPrdLoop("./prd.ts", {
  maxIterations: 5,
});

if (!result.success) {
  console.error(`Failed after ${result.attempts} attempts`);
  process.exit(1);
}
```

`runPrdLoop` runs your PRD, and if any gate fails it calls your `agent` function, then re-runs the PRD. This repeats until all gates pass or `maxIterations` is reached.

## With a custom agent

The `agent` option receives context about what failed and returns a list of changes:

```ts
import { runPrdLoop } from "gateproof/prd";

await runPrdLoop("./prd.ts", {
  maxIterations: 7,
  agent: async (ctx) => {
    // ctx.failedStory  — the story that failed
    // ctx.failureSummary — what went wrong
    // ctx.recentDiff   — recent git diff
    // ctx.prdContent   — full prd.ts source
    // ctx.iteration    — current attempt number

    // ... make changes to fix the failure ...

    return { changes: ["patched src/handler.ts"] };
  },
});
```

## With the OpenCode Zen agent

For AI-assisted fixes, use the built-in `createOpenCodeAgent`:

```ts
import { runPrdLoop, createOpenCodeAgent } from "gateproof/prd";

const agent = createOpenCodeAgent({
  apiKey: process.env.OPENCODE_ZEN_API_KEY,
  model: "big-pickle",
  maxSteps: 10,
});

await runPrdLoop("./prd.ts", { agent, maxIterations: 7 });
```

The agent gets `read`, `write`, and `replace` tools to inspect and edit files.

## Single-story mode

Pass a `Story` object instead of a path to loop on a single gate:

```ts
import { runPrdLoop } from "gateproof/prd";

await runPrdLoop(
  { id: "signup", title: "User signup works", gateFile: "./gates/signup.gate.ts" },
  { maxIterations: 3 }
);
```

## Tracking progress

Use `onIteration` for status updates and `writeEvidenceLog` to persist results:

```ts
await runPrdLoop("./prd.ts", {
  maxIterations: 5,
  writeEvidenceLog: true,
  onIteration: (status) => {
    console.log(`Attempt ${status.attempt}: ${status.passed ? "pass" : "fail"}`);
    if (status.failedStory) {
      console.log(`  failed: ${status.failedStory.id}`);
    }
  },
});
```

Evidence is appended to `.gateproof/evidence.log` as newline-delimited JSON.

## Auto-commit

Enable `autoCommit` to commit agent changes after each iteration:

```ts
await runPrdLoop("./prd.ts", {
  agent,
  autoCommit: true,
});
```

The commit message defaults to `fix(prd): <story-id> - iteration <n>`.

## Error recovery patterns

> Contributed by @grok

### Reading failure evidence in your agent

The agent context includes structured failure data. Parse it to make targeted fixes:

```ts
await runPrdLoop("./prd.ts", {
  maxIterations: 5,
  agent: async (ctx) => {
    // Structured failure — what assertion failed?
    if (ctx.failureSummary.includes("HasAction")) {
      // Missing action log — find where the action should be emitted
      console.log("Fix: ensure code logs the expected action");
    }

    if (ctx.failureSummary.includes("NoErrors")) {
      // Errors in logs — find and fix the error source
      console.log("Fix: resolve error in application code");
    }

    if (ctx.failureSummary.includes("ScopeViolation")) {
      // Changes touched forbidden paths — revert and take a different approach
      console.log("Fix: restrict changes to allowedPaths");
    }

    return { changes: ["applied targeted fix"] };
  },
});
```

### LLM-friendly failure summaries

Use `createLLMFailureSummary` from `gateproof/report` to build structured context for AI agents:

```ts
import { createLLMFailureSummary } from "gateproof/report";

// Inside your agent function:
const summary = createLLMFailureSummary(prdReport, {
  diffSnippet: ctx.recentDiff,
  logs: gateResult.logs,
});

// summary.failedAssertions  — what assertions failed
// summary.evidence          — what was observed
// summary.suggestions       — actionable next steps
// summary.prdRelevantSlice  — story context + scope
```

### Rollback on repeated failure

If the same gate fails multiple iterations in a row, consider reverting:

```ts
let lastFailedStory: string | null = null;
let consecutiveFailures = 0;

await runPrdLoop("./prd.ts", {
  maxIterations: 7,
  agent: async (ctx) => {
    if (ctx.failedStory?.id === lastFailedStory) {
      consecutiveFailures++;
      if (consecutiveFailures >= 3) {
        // Revert last changes and try a different approach
        const { execSync } = await import("child_process");
        execSync("git checkout -- .");
        consecutiveFailures = 0;
        return { changes: ["reverted — trying fresh approach"] };
      }
    } else {
      lastFailedStory = ctx.failedStory?.id ?? null;
      consecutiveFailures = 1;
    }

    // Normal fix logic...
    return { changes: ["applied fix"] };
  },
});
```

## Real-world gate examples

> Contributed by @grok

### Database check gate

```ts
import { Gate, Act, Assert } from "gateproof";
import { createEmptyObserveResource } from "gateproof";

export async function run() {
  return Gate.run({
    name: "db-migration-check",
    observe: createEmptyObserveResource(),
    act: [
      Act.exec("bun run db:migrate", { timeoutMs: 30000 }),
      Act.wait(1000),
    ],
    assert: [
      Assert.custom("tables_exist", async () => {
        const { execSync } = await import("child_process");
        const output = execSync("bun run db:check-tables").toString();
        return output.includes("users") && output.includes("sessions");
      }),
      Assert.custom("seed_data_present", async () => {
        const { execSync } = await import("child_process");
        const output = execSync("bun run db:count users").toString();
        return parseInt(output.trim(), 10) > 0;
      }),
    ],
    stop: { idleMs: 2000, maxMs: 60000 },
  });
}
```

### API rate-limit gate

```ts
export async function run() {
  return Gate.run({
    name: "rate-limit-enforced",
    observe: createEmptyObserveResource(),
    act: [Act.wait(500)],
    assert: [
      Assert.custom("rate_limit_triggers", async () => {
        const url = "https://api.example.com/endpoint";
        // Send requests rapidly
        const responses = await Promise.all(
          Array.from({ length: 20 }, () => fetch(url))
        );
        // At least one should be rate-limited (429)
        return responses.some(r => r.status === 429);
      }),
    ],
    stop: { idleMs: 2000, maxMs: 15000 },
  });
}
```

## CLI pipeline: natural language to running loop

> Contributed by @grok

End-to-end pipeline from plain language to a running agent loop:

```bash
# 1. Generate prd.ts from natural language
echo "Build a user signup flow with email verification and profile page" \
  | npx gateproof prdts --out prd.ts

# 2. Validate the generated PRD
npx gateproof smoke ./prd.ts

# 3. Run the agent loop
bun run prd.ts
```

Or as a single script:

```ts
import { runPrdLoop, createOpenCodeAgent } from "gateproof/prd";

const agent = createOpenCodeAgent({
  apiKey: process.env.OPENCODE_ZEN_API_KEY,
});

const result = await runPrdLoop("./prd.ts", {
  agent,
  maxIterations: 7,
  autoCommit: true,
  writeEvidenceLog: true,
  onIteration: (status) => {
    console.log(`[iteration ${status.attempt}] ${status.passed ? "PASS" : "FAIL"}`);
  },
});

if (!result.success) {
  console.error("PRD loop did not converge");
  process.exit(1);
}
console.log("All gates passed");
```

## Related

- Reference: `docs/reference/prd-runner.md`
- How-to: `docs/how-to/run-in-ci.md`
