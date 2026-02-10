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

## Related

- Reference: `docs/reference/prd-runner.md`
- How-to: `docs/how-to/run-in-ci.md`
