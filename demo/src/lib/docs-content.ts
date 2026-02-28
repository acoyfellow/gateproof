/**
 * All documentation content, keyed by slug.
 * Markdown is rendered at build time by the server loaders via renderMarkdown().
 */
export const docsContent: Record<string, string> = {

'tutorials/first-gate': `# Tutorial: Your First Gate (Local CLI Stream)

Goal: run a real gate locally using Cloudflare's CLI stream backend.

This is a guided, end‑to‑end path with a single outcome: **a gate passes using local logs**.

## Prereqs

- Bun or Node.js
- Wrangler running your worker locally
- \`CLOUDFLARE_ACCOUNT_ID\` and a \`WORKER_NAME\`

## 1. Start your worker locally

Run your worker with \`wrangler dev\` so logs can be streamed locally.

## 2. Create the gate file

Create \`gates/hello.gate.ts\`:

\`\`\`ts
#!/usr/bin/env bun
import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const workerName = process.env.WORKER_NAME || "my-worker";

const provider = CloudflareProvider({ accountId, apiToken: "" });

const gate = {
  name: "hello-gate",
  observe: provider.observe({
    backend: "cli-stream",
    workerName,
  }),
  act: [
    Act.browser({ url: "http://localhost:8787", headless: true }),
    Act.wait(2000),
  ],
  assert: [
    Assert.noErrors(),
    Assert.hasAction("request_received"),
  ],
  stop: { idleMs: 3000, maxMs: 15000 },
};

Gate.run(gate).then((result) => {
  if (result.status !== "success") process.exit(1);
  process.exit(0);
});
\`\`\`

## 3. Run the gate

\`\`\`bash
bun gates/hello.gate.ts
\`\`\`

If the action log \`request_received\` is emitted, the gate should pass.

## 4. If it fails

- Ensure \`wrangler dev\` is running
- Confirm \`WORKER_NAME\` matches the running worker
- Check your worker emits the action/stage you assert

## Next steps

- Add a second assertion (e.g. a stage or custom evidence)
- Convert this gate into a PRD story: [Write a PRD Story](/docs/how-to/write-a-prd-story)`,


'how-to/add-a-gate': `# How to Add a Gate

Goal: add a new gate that proves a real system behavior with evidence.

## Steps

1. Decide the evidence you can observe
- Example: an action tag like \`user_created\` or a stage like \`checkout_complete\`

2. Pick an observability backend
- Cloudflare Analytics Engine
- Cloudflare Workers Logs API
- CLI stream (local dev)

3. Create a new gate file

\`\`\`ts
import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

const provider = CloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken: process.env.CLOUDFLARE_API_TOKEN!,
});

export async function run() {
  return Gate.run({
    name: "user-signup",
    observe: provider.observe({ backend: "analytics", dataset: "worker_logs" }),
    act: [Act.browser({ url: "https://app.example.com/signup" })],
    assert: [
      Assert.hasAction("user_created"),
      Assert.noErrors(),
    ],
  });
}
\`\`\`

4. Prefer positive evidence
- Avoid \`Assert.noErrors()\` alone
- Always assert a real signal

## Related

- [Your First Gate](/docs/tutorials/first-gate)
- [API Reference](/docs/reference/api)`,


'how-to/add-observability-logging': `# How to Add Observability Logging

Goal: emit evidence that gates can assert reliably.

## What gates need

Gates assert **positive evidence** (actions/stages) and **absence of errors**. If your system is silent, gates can't prove success.

## Practical guidance

- Emit a **named action** when a critical transition completes
- Emit a **stage** when entering or exiting important phases
- Tag errors with stable identifiers

## Example (conceptual)

When a user signs up, emit evidence that a gate can assert:

- action: \`user_created\`
- stage: \`signup_complete\`
- error tag (if any): \`db_error\`

## Tip

Pick evidence you can observe consistently in prod and local dev. Your confidence is bounded by your telemetry.`,


'how-to/use-shorthands': `# How to Use Shorthands

> Contributed by @grok

Goal: write gates with less boilerplate using the optional shorthands module.

## Import

\`\`\`ts
import {
  gate, commandGate, browserGate,
  noErrors, hasAction, hasStage, custom,
  browserAct, execAct, cloudflare, emptyObserve,
  hasAnyEvidence, hasMinLogs, allOf, anyOf, not,
} from "gateproof/shorthands";
\`\`\`

## gate() — simplified Gate.run

The \`gate()\` function wraps \`Gate.run\` with sensible defaults. \`observe\` defaults to empty, and \`act\`/\`assert\` accept single items or arrays.

\`\`\`ts
const result = await gate("health-check", {
  act: execAct.run("curl -f http://localhost:8787/api/health"),
  assert: noErrors(),
});

if (result.status !== "success") process.exit(1);
\`\`\`

## commandGate() — run a command and check exit code

For build/test gates that don't need log observation:

\`\`\`ts
const result = await commandGate("build", "bun run build");
\`\`\`

\`\`\`ts
const result = await commandGate("test", "bun test", { cwd: "./app" });
\`\`\`

## browserGate() — navigate and assert

\`\`\`ts
const result = await browserGate("homepage", "https://app.example.com", {
  observe: cloudflare.logs({ dataset: "worker_logs" }),
  assert: [hasAction("page_loaded"), noErrors()],
});
\`\`\`

## Flat assertions

Instead of \`Assert.noErrors()\`, use the flat equivalents:

| Shorthand | Equivalent |
|-----------|-----------|
| \`noErrors()\` | \`Assert.noErrors()\` |
| \`hasAction("name")\` | \`Assert.hasAction("name")\` |
| \`hasStage("stage")\` | \`Assert.hasStage("stage")\` |
| \`custom("name", fn)\` | \`Assert.custom("name", fn)\` |
| \`hasAnyEvidence()\` | Custom: any action or stage in logs |
| \`hasMinLogs(n)\` | Custom: at least N log entries |
| \`hasLogWith(field, value)\` | Custom: log with specific field value |

## Assertion combinators

Combine assertions with logic operators:

\`\`\`ts
// All must pass (same as passing an array)
assert: allOf(hasAction("created"), noErrors())

// At least one must pass
assert: anyOf(hasAction("created"), hasAction("updated"))

// Negate an assertion
assert: not(hasStage("error_stage"))
\`\`\`

## Action helpers

\`\`\`ts
// Browser actions
browserAct.goto("https://example.com")
browserAct.gotoVisible("https://example.com")  // headless: false

// Command execution
execAct.run("curl http://localhost:8787")
execAct.npm("test")
execAct.bun("build")
\`\`\`

## Cloudflare observe helpers

Auto-reads \`CLOUDFLARE_ACCOUNT_ID\` and \`CLOUDFLARE_API_TOKEN\` from env:

\`\`\`ts
// Analytics Engine
observe: cloudflare.logs({ dataset: "worker_logs" })

// Workers Logs API
observe: cloudflare.workersLogs({ workerName: "my-worker" })

// CLI stream (local dev)
observe: cloudflare.cliStream()
\`\`\`

## Full example

\`\`\`ts
import {
  gate, noErrors, hasAction, browserAct, cloudflare,
} from "gateproof/shorthands";

const result = await gate("user-signup", {
  observe: cloudflare.logs({ dataset: "worker_logs" }),
  act: browserAct.goto("https://app.example.com/signup"),
  assert: [noErrors(), hasAction("user_created")],
});

if (result.status !== "success") process.exit(1);
\`\`\`

Compare with the full API equivalent:

\`\`\`ts
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
\`\`\`

## Related

- [API Reference](/docs/reference/api)
- [Add a Gate](/docs/how-to/add-a-gate)`,


'how-to/accessibility': `# How to Build Accessible Gates

> Contributed by @grok

Goal: ensure gates and their outputs support accessibility (a11y) best practices.

## Why accessibility matters for gates

Gates that drive browser actions interact with real UIs. If your gate triggers a signup flow, the UI it tests should be accessible. Gates can **verify** accessibility, not just functionality.

## Adding alt text in browser gate examples

When gates use \`Act.browser()\` to test pages with images, ensure the pages under test include alt text. You can assert this with a custom gate:

\`\`\`ts
import { Gate, Act, Assert, createHttpObserveResource } from "gateproof";

export async function run() {
  return Gate.run({
    name: "images-have-alt-text",
    observe: createHttpObserveResource({ url: "https://app.example.com/logs" }),
    act: [
      Act.browser({
        url: "https://app.example.com",
        headless: true,
        waitMs: 3000,
      }),
    ],
    assert: [
      Assert.custom("all_images_have_alt", async () => {
        // Use playwright to check all images have alt text
        const { chromium } = await import("playwright");
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto("https://app.example.com");
        const images = await page.locator("img").all();
        const results = await Promise.all(
          images.map(async (img) => {
            const alt = await img.getAttribute("alt");
            return alt !== null && alt.trim().length > 0;
          })
        );
        await browser.close();
        return results.every(Boolean);
      }),
      Assert.noErrors(),
    ],
    stop: { idleMs: 3000, maxMs: 30000 },
  });
}
\`\`\`

## ARIA attributes for report UIs

If you build a UI to display gate results (e.g., a dashboard), use ARIA attributes for screen reader support:

\`\`\`html
<!-- Gate result status -->
<div role="status" aria-live="polite" aria-label="Gate result">
  <span aria-label="Gate passed">pass</span>
</div>

<!-- Evidence list -->
<ul role="list" aria-label="Evidence collected">
  <li role="listitem">Action: user_created</li>
  <li role="listitem">Stage: signup_complete</li>
</ul>

<!-- Gate progress -->
<div role="progressbar" aria-valuenow="3" aria-valuemin="0" aria-valuemax="7"
     aria-label="PRD progress: 3 of 7 stories passed">
</div>

<!-- Error summary -->
<div role="alert" aria-label="Gate failure details">
  <p>Gate "user-signup" failed: HasAction: missing 'user_created'</p>
</div>
\`\`\`

## Accessibility gates for common checks

### Color contrast gate

\`\`\`ts
Assert.custom("color_contrast_ok", async () => {
  // Check WCAG AA contrast ratios on key elements
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://app.example.com");

  // Use axe-core for automated a11y testing
  await page.addScriptTag({ url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.0/axe.min.js" });
  const results = await page.evaluate(() => (window as any).axe.run());
  await browser.close();

  return results.violations.length === 0;
})
\`\`\`

### Keyboard navigation gate

\`\`\`ts
Assert.custom("keyboard_navigable", async () => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://app.example.com");

  // Tab through interactive elements and verify focus is visible
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  await browser.close();

  return focused !== "BODY"; // Something received focus
})
\`\`\`

## Tips

- Use \`axe-core\` via Playwright for automated WCAG checks in gates
- Assert alt text, ARIA labels, and keyboard navigation as positive evidence
- Gate results are JSON-serializable by default, making them screen-reader-pipeline friendly
- When building report UIs, follow WCAG 2.1 AA as a baseline

## Related

- [Add a Gate](/docs/how-to/add-a-gate)
- [API Reference](/docs/reference/api)`,


'how-to/run-in-ci': `# How to Run Gates in CI

Goal: enforce gates before merge or deploy.

## Steps

1. Validate PRD shape

\`\`\`bash
bun run prd:validate
\`\`\`

2. Run PRD in CI

\`\`\`yaml
- name: Run PRD
  run: bun run prd.ts
\`\`\`

3. Fail fast on the first failing gate
- \`runPrd\` stops on first failure by default

## Related

- [PRD Runner](/docs/reference/prd-runner)`,


'how-to/run-in-a-loop': `# How to Run Gates in a Loop

Goal: iterate on code until all gates pass, with an optional agent making fixes between attempts.

## Basic loop

\`\`\`ts
import { runPrdLoop } from "gateproof/prd";

const result = await runPrdLoop("./prd.ts", {
  maxIterations: 5,
});

if (!result.success) {
  console.error(\`Failed after \${result.attempts} attempts\`);
  process.exit(1);
}
\`\`\`

\`runPrdLoop\` runs your PRD, and if any gate fails it calls your \`agent\` function, then re-runs the PRD. This repeats until all gates pass or \`maxIterations\` is reached.

## With a custom agent

The \`agent\` option receives context about what failed and returns a list of changes:

\`\`\`ts
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
\`\`\`

## With the OpenCode Zen agent

For AI-assisted fixes, use the built-in \`createOpenCodeAgent\`:

\`\`\`ts
import { runPrdLoop, createOpenCodeAgent } from "gateproof/prd";

const agent = createOpenCodeAgent({
  apiKey: process.env.OPENCODE_ZEN_API_KEY,
  model: "big-pickle",
  maxSteps: 10,
});

await runPrdLoop("./prd.ts", { agent, maxIterations: 7 });
\`\`\`

The agent gets \`read\`, \`write\`, and \`replace\` tools to inspect and edit files.

## Single-story mode

Pass a \`Story\` object instead of a path to loop on a single gate:

\`\`\`ts
import { runPrdLoop } from "gateproof/prd";

await runPrdLoop(
  { id: "signup", title: "User signup works", gateFile: "./gates/signup.gate.ts" },
  { maxIterations: 3 }
);
\`\`\`

## Tracking progress

Use \`onIteration\` for status updates and \`writeEvidenceLog\` to persist results:

\`\`\`ts
await runPrdLoop("./prd.ts", {
  maxIterations: 5,
  writeEvidenceLog: true,
  onIteration: (status) => {
    console.log(\`Attempt \${status.attempt}: \${status.passed ? "pass" : "fail"}\`);
    if (status.failedStory) {
      console.log(\`  failed: \${status.failedStory.id}\`);
    }
  },
});
\`\`\`

Evidence is appended to \`.gateproof/evidence.log\` as newline-delimited JSON.

## Auto-commit

Enable \`autoCommit\` to commit agent changes after each iteration:

\`\`\`ts
await runPrdLoop("./prd.ts", {
  agent,
  autoCommit: true,
});
\`\`\`

The commit message defaults to \`fix(prd): <story-id> - iteration <n>\`.

## Error recovery patterns

> Contributed by @grok

### Reading failure evidence in your agent

The agent context includes structured failure data. Parse it to make targeted fixes:

\`\`\`ts
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
\`\`\`

### LLM-friendly failure summaries

Use \`createLLMFailureSummary\` from \`gateproof/report\` to build structured context for AI agents:

\`\`\`ts
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
\`\`\`

### Rollback on repeated failure

If the same gate fails multiple iterations in a row, consider reverting:

\`\`\`ts
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
\`\`\`

## Real-world gate examples

> Contributed by @grok

### Database check gate

\`\`\`ts
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
\`\`\`

### API rate-limit gate

\`\`\`ts
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
\`\`\`

## CLI pipeline: natural language to running loop

> Contributed by @grok

End-to-end pipeline from plain language to a running agent loop:

\`\`\`bash
# 1. Generate prd.ts from natural language
echo "Build a user signup flow with email verification and profile page" \\
  | npx gateproof prdts --out prd.ts

# 2. Validate the generated PRD
npx gateproof smoke ./prd.ts

# 3. Run the agent loop
bun run prd.ts
\`\`\`

Or as a single script:

\`\`\`ts
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
    console.log(\`[iteration \${status.attempt}] \${status.passed ? "PASS" : "FAIL"}\`);
  },
});

if (!result.success) {
  console.error("PRD loop did not converge");
  process.exit(1);
}
console.log("All gates passed");
\`\`\`

## Related

- [PRD Runner](/docs/reference/prd-runner)
- [Run in CI](/docs/how-to/run-in-ci)`,


'how-to/write-a-prd-story': `# How to Write a PRD Story

Goal: define a single story that points to a gate and encodes intent.

## Story shape

\`\`\`ts
{
  id: "user-signup",
  title: "User can sign up — evidence: user_created — scope: src/routes/**",
  gateFile: "./gates/user-signup.gate.ts",
  dependsOn: [],
  scope: {
    allowedPaths: ["src/routes/**", "src/lib/**"],
    maxChangedFiles: 5,
    maxChangedLines: 200,
  },
  progress: ["signup_page_live", "user_created"],
}
\`\`\`

## Tips

- Encode behavior + evidence + scope in the title
- Keep IDs literal and stable
- Use \`dependsOn\` only when required

## Full PRD example

\`\`\`ts
import { definePrd } from "gateproof/prd";

export const prd = definePrd({
  stories: [
    {
      id: "user-signup",
      title: "User can sign up — evidence: user_created — scope: src/routes/**",
      gateFile: "./gates/user-signup.gate.ts",
      progress: ["signup_page_live", "user_created"],
    },
  ] as const,
});
\`\`\`

## Related

- [PRD Runner](/docs/reference/prd-runner)`,


'how-to/run-an-agent-gate': `# How to Run an Agent Gate

Goal: spawn an AI agent in an isolated container, observe its NDJSON event stream, and assert governance policies against its behavior.

## Prerequisites

- A Cloudflare account with Sandbox access (\`@cloudflare/sandbox\`)
- An agent that emits NDJSON on stdout (e.g., Claude Code, Codex)

## 1. Set up the container runtime

\`\`\`ts
import { setFilepathRuntime, CloudflareSandboxRuntime } from "gateproof";
import { getSandbox } from "@cloudflare/sandbox";

setFilepathRuntime(new CloudflareSandboxRuntime({
  getSandbox: (config) => getSandbox(env.Sandbox, \`agent-\${config.name}-\${Date.now()}\`),
}));
\`\`\`

This registers the runtime globally. Call it once at startup.

## 2. Spawn and observe

\`\`\`ts
import { createFilepathObserveResource } from "gateproof";

const container = await runtime.spawn({
  name: "fix-auth",
  agent: "claude-code",
  model: "claude-sonnet-4-20250514",
  task: "Fix the null pointer in src/auth.ts",
  env: { FILEPATH_API_KEY: process.env.API_KEY },
});

const observe = createFilepathObserveResource(container, "fix-auth");
\`\`\`

The container's stdout is automatically parsed as NDJSON lines. Each event becomes a structured \`Log\` entry.

## 3. Run the gate with authority assertions

\`\`\`ts
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
\`\`\`

\`Assert.authority()\` checks the agent's actual behavior against the policy:

- **canCommit**: Did the agent commit? If \`false\` and a commit was observed, the gate fails.
- **canSpawn**: Did the agent spawn child agents? If \`false\` and a spawn was observed, the gate fails.
- **forbiddenTools**: Did the agent call any forbidden tools? If so, the gate fails.

## NDJSON event types

The agent must emit one JSON object per line on stdout:

| type | key fields |
|------|-----------|
| \`text\` | \`content\` |
| \`tool\` | \`name\`, \`path?\`, \`status: "start"\\|"done"\\|"error"\` |
| \`command\` | \`cmd\`, \`status\`, \`exit?\`, \`stdout?\`, \`stderr?\` |
| \`commit\` | \`hash\`, \`message\` |
| \`spawn\` | \`name\`, \`agent\`, \`model\` |
| \`status\` | \`state: "thinking"\\|"idle"\\|"error"\` |
| \`done\` | \`summary\` |

## Testing with the mock container

For unit tests, use the mock instead of a real container:

\`\`\`ts
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
\`\`\`

## Sending input to the agent

Use \`container.sendInput()\` to send NDJSON messages to the agent's stdin:

\`\`\`ts
await container.sendInput(JSON.stringify({
  type: "message",
  from: "user",
  content: "focus on the auth module only",
}));
\`\`\`

## Related

- [API Reference](/docs/reference/api)
- [How Gateproof Works](/docs/explanations/overview)`,


'reference/api': `# API Reference

## Gate.run(spec)

Run a gate. Returns a result with status, logs, and evidence.

- \`spec.name\` is optional metadata
- \`spec.observe\` defines how logs are collected
- \`spec.act\` triggers behavior
- \`spec.assert\` verifies evidence
- \`spec.stop\` defines \`idleMs\` and \`maxMs\`

## Actions

\`\`\`ts
Act.exec("command")              // Run shell command
Act.browser({ url, headless? })  // Browser automation (playwright)
Act.wait(ms)                     // Sleep
Act.deploy({ worker })           // Deploy marker
\`\`\`

## Agent Actions

\`\`\`ts
Act.agent({
  name: "fix-auth",               // Display name
  agent: "claude-code",           // Agent type: "claude-code" | "codex" | "cursor" | image
  model: "claude-sonnet-4-20250514",
  task: "Fix the null pointer",   // Natural language task (→ FILEPATH_TASK env var)
  repo?: "https://github.com/...",  // Git repo to clone into /workspace
  env?: { KEY: "value" },         // Extra environment variables
  timeoutMs?: 300_000,            // Default: 5 minutes
})
\`\`\`

## Container Runtime

\`\`\`ts
import { setFilepathRuntime, CloudflareSandboxRuntime } from "gateproof";
import { getSandbox } from "@cloudflare/sandbox";

// Register once at startup
setFilepathRuntime(new CloudflareSandboxRuntime({
  getSandbox: (config) => getSandbox(env.Sandbox, \`agent-\${config.name}\`),
  command?: (config) => ["my-agent", "--model", config.model],  // Override entrypoint
}));
\`\`\`

Or spawn containers manually and observe them directly:

\`\`\`ts
import { createFilepathObserveResource } from "gateproof";

const container = await runtime.spawn(config);
const observe = createFilepathObserveResource(container, "my-agent");
\`\`\`

The container's stdout must emit NDJSON (one JSON object per line). Supported event types: \`text\`, \`tool\`, \`command\`, \`commit\`, \`spawn\`, \`workers\`, \`status\`, \`handoff\`, \`done\`.

## Assertions

\`\`\`ts
Assert.noErrors()
Assert.hasAction("name")
Assert.hasStage("stage")
Assert.custom("name", (logs) => boolean)
Assert.authority({
  canCommit: true,          // Agent is allowed to commit
  canSpawn: false,          // Agent must NOT spawn child agents
  forbiddenTools: ["delete_file"],  // Tools the agent must not use
})
\`\`\`

\`Assert.authority()\` checks the agent's actual behavior (commits, spawns, tool calls observed in logs) against the policy you define. Fails if the agent exceeded its authority.

## Shorthands (optional)

> Contributed by @grok

Flat helpers that reduce boilerplate. Import from \`gateproof/shorthands\`:

\`\`\`ts
import { gate, commandGate, browserGate } from "gateproof/shorthands";

await gate("my-gate", { act: execAct.run("npm test"), assert: noErrors() });
await commandGate("build", "npm run build");
await browserGate("home", "https://example.com", { assert: hasAction("loaded") });
\`\`\`

See full guide: [Use Shorthands](/docs/how-to/use-shorthands)

## Result

\`\`\`ts
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
\`\`\`

## JSON Schemas for AI Agents

> Contributed by @grok

Gate results and PRD reports are fully JSON-serializable for machine consumption. Use these schemas to parse gate outputs in agent pipelines.

### GateResultV1

\`\`\`json
{
  "version": "1",
  "status": "success | failed | timeout",
  "durationMs": 1234,
  "logs": [],
  "evidence": {
    "requestIds": ["req-abc"],
    "stagesSeen": ["worker", "db"],
    "actionsSeen": ["user_created"],
    "errorTags": []
  },
  "error": {
    "tag": "AssertionFailed",
    "name": "AssertionFailed",
    "message": "HasAction: missing 'user_created'",
    "stack": "..."
  }
}
\`\`\`

### PrdReportV1

\`\`\`json
{
  "version": "1",
  "success": false,
  "stories": [
    {
      "id": "user-signup",
      "title": "User can sign up",
      "gateFile": "./gates/signup.gate.ts",
      "status": "failed",
      "durationMs": 5432,
      "error": { "tag": "AssertionFailed", "name": "AssertionFailed", "message": "..." }
    }
  ],
  "failedStory": {
    "id": "user-signup",
    "title": "User can sign up",
    "gateFile": "./gates/signup.gate.ts"
  },
  "totalDurationMs": 5432
}
\`\`\`

### LLMFailureSummary

Structured failure context optimized for AI agents. Generated by \`createLLMFailureSummary()\` from \`gateproof/report\`:

\`\`\`json
{
  "summary": "Gate \\"user-signup\\" failed: HasAction: missing 'user_created'",
  "failedAssertions": [
    {
      "name": "HasAction",
      "message": "missing 'user_created'",
      "expected": "user_created in logs",
      "actual": "not found"
    }
  ],
  "prdRelevantSlice": {
    "storyId": "user-signup",
    "storyTitle": "User can sign up",
    "gateFile": "./gates/signup.gate.ts",
    "scope": { "allowedPaths": ["src/routes/**"] }
  },
  "evidence": {
    "actionsSeen": ["page_load"],
    "stagesSeen": ["worker"],
    "errorTags": [],
    "logCount": 12
  },
  "diffSnippet": "diff --git a/src/routes/signup.ts ...",
  "suggestions": [
    "Ensure the code logs an action named 'user_created'",
    "Check if the relevant code path is being executed"
  ]
}
\`\`\`

Usage in agent code:

\`\`\`ts
import { createLLMFailureSummary } from "gateproof/report";

const summary = createLLMFailureSummary(prdReport, {
  prdSlice: { storyId: "user-signup", storyTitle: "...", gateFile: "..." },
  diffSnippet: recentGitDiff,
  logs: gateResult.logs,
});

// Feed to your agent as structured JSON
const agentPrompt = JSON.stringify(summary, null, 2);
\`\`\``,


'reference/prd-runner': `# PRD Runner Reference

## PRD capsule shape

\`\`\`ts
{
  stories: [
    {
      id: "story-id",
      title: "Behavior — evidence: action — scope: path",
      gateFile: "./gates/story.gate.ts",
      dependsOn?: ["other-story"],
      progress?: ["checkpoint"],
      scope?: {
        allowedPaths?: string[],
        forbiddenPaths?: string[],
        maxChangedFiles?: number,
        maxChangedLines?: number,
      },
    }
  ]
}
\`\`\`

## Runner behavior

- Validates dependency existence and cycles
- Topologically sorts by \`dependsOn\`
- Executes gates in order
- Stops on first failure

## DAG Visualization of Dependencies

> Contributed by @grok

The runner resolves stories as a directed acyclic graph (DAG). Visualizing dependencies helps catch design issues early.

### Linear chain

\`\`\`
setup-db ──> create-user ──> verify-email ──> user-login
\`\`\`

### Diamond (converging)

\`\`\`
              ┌── oauth-google ──┐
auth-setup ──┤                    ├──> unified-login
              └── oauth-github ──┘
\`\`\`

### Parallel tracks with final merge

\`\`\`
user-signup ──> user-login ──────────┐
                                      ├──> paid-user-flow
payment-setup ──> checkout ──────────┘
\`\`\`

### Mapping your own PRD

Read your \`prd.ts\` and draw the graph by tracing \`dependsOn\` edges:

\`\`\`
for each story S in prd.stories:
  if S.dependsOn:
    for each dep in S.dependsOn:
      dep ──> S
  else:
    S is a root node (no incoming edges)
\`\`\`

Stories with no \`dependsOn\` are roots (executed first). Stories that no other story depends on are leaves. The runner executes in topological order, stopping on first failure.

## Validator

\`bun run prd:validate\` checks:

- Gate files exist and export \`run()\`
- \`progress\` (if present) is a list of strings

## Example

\`\`\`ts
import { definePrd, runPrd } from "gateproof/prd";

const prd = definePrd({
  stories: [
    {
      id: "story-1",
      title: "First story — evidence: done — scope: src/**",
      gateFile: "./gates/story-1.gate.ts",
    },
  ] as const,
});

const result = await runPrd(prd);
if (!result.success) process.exit(1);
\`\`\``,


'explanations/overview': `# Explanation: How Gateproof Works

Gateproof's core idea is simple:

- **PRD defines intent** (what should exist)
- **Gates verify reality** (does it work, with evidence)
- **Agents iterate** until gates pass

## Authority boundaries

- PRD owns intent and dependency order
- Gate implementations own observation
- Gateproof runtime enforces only

## Evidence-first verification

Gates observe logs/telemetry, perform actions, and assert evidence. This prevents "pass on silence" and makes failures actionable.

## Deeper architecture

- [Effect and Schema](/docs/effect-and-schema) explains Effect and Schema design choices

## Agent containers and authority

Gateproof can observe AI agents running in isolated containers. The agent emits NDJSON events on stdout (tool calls, commits, status updates), and gateproof maps them to structured logs.

\`Assert.authority()\` enforces governance policies against the agent's observed behavior:

\`\`\`ts
Assert.authority({
  canCommit: true,           // allowed to commit
  canSpawn: false,           // must not spawn child agents
  forbiddenTools: ["rm"],    // must not use these tools
})
\`\`\`

This turns "trust but verify" into "verify, then trust." The agent runs freely inside its container; the gate checks that it stayed within bounds.

### Container runtime

The real runtime uses Cloudflare Sandbox (\`@cloudflare/sandbox\`). The container's stdout is a \`ReadableStream<Uint8Array>\` that gets parsed into NDJSON lines and exposed as a broadcast \`AsyncIterable<string>\` — both the executor and observe layer can read concurrently without interference.

For testing, use \`createMockFilepathContainer()\` to emit events without a real container.

## Agent prompt templates

> Contributed by @grok

When building agent integrations, use structured prompts that reference gate output directly:

### Fix-a-failing-gate prompt

\`\`\`
You are fixing a failing gate in a gateproof PRD.

## Failed gate
Story: {{failedStory.id}}
Title: {{failedStory.title}}
Gate file: {{failedStory.gateFile}}
Allowed paths: {{scope.allowedPaths}}

## What failed
{{failureSummary}}

## Evidence observed
Actions seen: {{evidence.actionsSeen}}
Stages seen: {{evidence.stagesSeen}}
Error tags: {{evidence.errorTags}}

## Recent diff
{{recentDiff}}

## Instructions
1. Read the gate file to understand what evidence is expected.
2. Find the source code that should emit the missing evidence.
3. Make the minimal change to fix the failing assertion.
4. Stay within the allowed paths.
\`\`\`

### Spec interview prompt

\`\`\`
Let's interview each other about this feature.
Ask me the minimum set of questions needed to write PRD stories with gates.
Focus on: smallest user-visible behavior, observable evidence, hard constraints, scope limits.
Output: 3-7 stories in gateproof format with id, title, gateFile, dependsOn, scope.
\`\`\`

## Roadmap

> Contributed by @grok

Features under consideration for future versions:

- **Multi-agent collaboration**: Multiple agents working on independent story tracks in parallel, coordinated by the PRD dependency graph
- **Distributed agent execution**: Running agent loops across multiple machines with shared PRD state
- **Auto-scaling loops**: Dynamic \`maxIterations\` based on failure patterns (increase for flaky gates, decrease for repeated identical failures)
- **Built-in fix prompts**: Pre-written prompt templates for common failure types (missing action, scope violation, timeout)
- **Metrics export**: Export gate results as OpenTelemetry spans or Prometheus metrics for monitoring dashboards
- **PRD sharding**: Split large PRDs into index + module PRDs for token-efficient agent consumption (design documented in [Effect and Schema](/docs/effect-and-schema))`,


'effect-and-schema': `# Effect and Schema: Gateproof's Foundation

## Effect as the Runtime Spine

Effect is Gateproof's internal runtime discipline. It provides:

- **Typed failure**: All errors are typed and composable. Gate failures, observability errors, and action errors are distinct types that compose predictably.
- **Structured concurrency**: Actions, log collection, and assertions run within Effect's structured concurrency model. Cancellation propagates correctly.
- **Retries, timeouts, cancellation**: Built-in primitives for retry schedules, timeout handling, and cancellation. Actions can be retried with exponential backoff; log collection respects idle and max timeouts.
- **Resource safety**: Backends are acquired and released via \`acquireUseRelease\`. Browser instances, log streams, and network connections are guaranteed cleanup.

Gateproof's \`Gate.run\` is implemented as an Effect. The public API returns a Promise, but internally everything is Effect.

## Schema: What We Standardize (Today)

Effect is the runtime discipline inside Gateproof. Schema is used primarily for **tagged error types** (e.g. assertion failures, observability errors) so failures are structured and composable.

### PRD "Capsule" Shape (simple, explicit)

Gateproof ships an optional PRD runner (\`gateproof/prd\`). If you use it, your PRD must match a small shape:

- Story: \`id\`, \`title\`, \`gateFile\`, \`dependsOn?\`, \`progress?\`
- PRD: \`{ stories: Story[] }\`

Validation today is intentionally boring:
- Dependency existence + cycle detection (in the runner)
- Gate file exists + exports \`run()\` (in \`scripts/prd-validate.ts\`)
- \`progress\` (if present) must be a list of strings (in \`scripts/prd-validate.ts\`)

Gateproof does **not** own your PRD's intent or state. It doesn't mutate the PRD. It only uses the capsule shape if you opt into the runner/validator.
The optional \`progress\` field is a list of human/agent checkpoints; gateproof treats it as opaque metadata.

### Gate Result/Evidence Contract

The \`GateResult\` shape is standardized as a TypeScript type:

\`\`\`typescript
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
\`\`\`

This contract enables:
- Stable output for audit trails
- Consistent debug/display tooling
- Evidence serialization for CI/CD reports
- Future result aggregation across gates

## What We Are NOT Doing

To keep Gateproof minimal:

- **Not requiring users to learn Effect**: The public API is Promise-based. Users never see Effect types unless they implement custom backends.
- **Not inventing a DSL**: Gates are TypeScript files. No custom syntax, no configuration languages.
- **Not turning Gateproof into a planner/orchestrator**: Gateproof executes gates. It does not decide which gates to run, when to run them, or how to sequence them. The PRD owns intent and state.

## Future-Proofing: PRD Sharding (idea, not shipped)

This is an idea worth preserving, but it's not implemented in the current codebase.

**The invariant**: A fresh agent only needs the actionable slice (e.g. stories not yet done, however you track that).

**The mechanism**: Schema enables:
- **Index PRD**: Contains story IDs, statuses, dependencies, and module references. Small, fast to load.
- **Module PRDs**: Full story details grouped by module/domain. Loaded on-demand when a story becomes actionable.

When an agent needs to work on a story:
1. Load the index PRD (always small)
2. Find the story's module
3. Load only that module's PRD
4. Extract the actionable slice

The Schema contract ensures index and module PRDs are compatible. Gate implementations don't change. The PRD capsule shape remains stable.

This enables scaling to large PRDs (hundreds of stories) without requiring agents to load everything upfront.

## Authority Boundaries

- **PRD owns intent and state**: Stories, dependencies, status tracking. Gateproof never modifies PRD state.
- **Gate implementations own observation**: How logs are collected, which backends are used, what assertions are checked.
- **Gateproof runtime enforces only**: Executes gates, returns evidence. Does not decide what to build or when to proceed.

Effect is the runtime discipline inside Gateproof. Schema stabilizes the two truth-carrying artifacts. Everything else stays optional.`,


'sandbox-troubleshooting': `# Sandbox troubleshooting

## Findings (Jan 27, 2026)

- The SSE monitor loop treated \`process.getStatus()\` as an object, so it never observed terminal status and waited until the 180s deadline. This produced timeouts even when the process completed successfully.
- Sandbox provisioning calls can fail transiently during container spin-up. The errors surfaced as \`SandboxError HTTP error\` without actionable context.
- SSE responses had no keepalive, so idle runs were vulnerable to proxy timeouts when log output was sparse.

## Corrective steps applied

- Fix monitor status handling to treat \`process.getStatus()\` as a string and emit \`complete\` immediately on terminal states.
- Add SSE keepalive pings every ~25s to prevent idle connection drops.
- Add bounded retry + richer error summaries for \`mkdir\`, \`startProcess\`, and log streaming to surface provisioning failures and reduce flakiness.
- Increase the Cloudflare sandbox container \`instanceType\` from \`lite\` to \`standard-3\` so the Docker instance has more RAM/CPU during provisioning and execution, making transient memory-related 500s less likely.
- Wait for a lightweight sandbox readiness check (\`listFiles\`/pending) before mutating \`/workspace\`, giving Cloudflare a moment to finish provisioning before the first \`mkdir\`.
- Retry \`mkdir\` aggressively (many attempts with backoff) even after readiness checks in case the container still returns HTTP 500 during the provisioning window.

## Next checks to run

- Hit \`/api/prd/run/diagnose\` and confirm the response includes debug detail (status, code) when errors occur.
- Run \`/api/prd/run\` with a short PRD and verify the SSE emits \`complete\` well before the 180s timeout.
- If \`SandboxError HTTP error\` persists, capture \`requestId\` + sandboxId and compare against Cloudflare container/DO logs for provisioning limits.`,

};
