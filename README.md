# gateproof

Software is built in reverse. You know what you want before you know how to get there. TDD proved the idea: write the test first, then make it pass. Gateproof takes the next step.

Write stories. Attach gates. Let agents iterate until reality matches intent.

A **gate** observes real evidence (logs, telemetry), acts (browser, shell, deploy), and asserts outcomes. A **story** is a gate with a name and a place in a plan. A **prd.ts** is a list of stories in dependency order. The agent's only job is to make the next failing gate pass.

## The thesis

Plans are solid. Implementation is liquid.

Any codebase can be scoped down to stories and a `prd.ts`. Multiple agents can work the same plan, falling through the same checkpoints. Once a gate passes, previous work can't break -- the gate proves it. The skill shifts from writing code to defining the right guardrails.

Gates are checkpoints that keep agents safe. They don't decide intent. They verify reality.

## Why this works

Formal verification research established that the relationship between a specification and its implementation — called **refinement** — is itself a testable property. You don't need a theorem prover to get value from this idea. You can test refinement cheaply by running the system and checking that its behavior satisfies the spec.

Gateproof distills this into three primitives:

1. **Observe** — collect real evidence (logs, telemetry) from a running system
2. **Act** — trigger real behavior (browser navigation, shell commands, deploys)
3. **Assert** — check that the evidence satisfies the specification

Each gate is a refinement check: does the running system's behavior refine what the story claims? The PRD orders these checks by dependency, so failures localize to the first broken obligation.

This is a deliberate simplification. We trade random input generation and exhaustive coverage for something an engineer can write in minutes and an agent can iterate against in a loop. The gate is the contract. The loop is the proof search.

> Lineage: the *observe → act → assert* pattern draws on property-based testing ideas from [Chen, Rizkallah et al. — "Property-Based Testing: Climbing the Stairway to Verification" (SLE 2022)](https://doi.org/10.1145/3567512.3567520), which demonstrated that refinement properties can serve as a practical, incremental path toward verified systems.

## Install

```bash
bun add gateproof
```

## Minimal gate

```ts
import { Gate, Act, Assert, createHttpObserveResource } from "gateproof";

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

## Assertions

Core: `noErrors()`, `hasAction(name)`, `hasStage(name)`, `custom(name, fn)`

Shorthands: `hasAnyEvidence()`, `hasMinLogs(n)`, `hasLogWith(field, value)`, `allLogsMatch(name, fn)`, `someLogsMatch(name, fn)`, `anyOf(...assertions)`, `not(assertion)`

```ts
import { gate, noErrors, hasAction, hasMinLogs, custom, anyOf } from "gateproof/shorthands";

await gate("checkout-flow", {
  observe: cloudflare.logs({ dataset: "worker_logs" }),
  act: browserAct.goto("https://app.example.com/checkout"),
  assert: [
    noErrors(),
    hasAction("checkout_started"),
    hasMinLogs(3),
    custom("has-total", (logs) => logs.some(l => l.data?.total > 0)),
  ],
});
```

## Writing good gates

The hardest part of gateproof is not the library — it's writing gates that actually prove what you think they prove.

**A weak gate passes on silence.** If your system emits no logs and your only assertion is `noErrors()`, the gate passes vacuously. Nothing was tested. Use `requirePositiveSignal: true` on stories, or assert specific evidence (`hasAction`, `hasStage`, `hasMinLogs`).

**A good gate is falsifiable.** Ask: "what broken implementation would still pass this gate?" If the answer is "many," the gate is too weak. Tighten it until a broken system fails.

**Start narrow, then widen.** One specific assertion that catches a real failure is worth more than ten vague ones. You can always add assertions later — you can't take back a false pass.

## The loop

Gate fails. Agent reads the failure evidence. Agent fixes code. Gate re-runs. Loop until pass.

**Bring your own agent** — the loop takes any async function:

```ts
import { runPrdLoop } from "gateproof/prd";

await runPrdLoop("./prd.ts", {
  agent: async (ctx) => {
    // ctx.failureSummary — what failed and why
    // ctx.recentDiff    — recent git changes
    // ctx.prdContent    — full PRD for context
    // ctx.failedStory   — the Story object that failed
    // ctx.signal        — AbortSignal for cancellation

    // Use any agent: Claude Code, Cursor, Codex, custom LLM wrapper
    const result = await yourAgent.fix(ctx.failureSummary);
    return { changes: result.files, commitMsg: "fix: resolve failing gate" };
  },
  maxIterations: 5,
});
```

Or use a pre-built agent:

```ts
import { runPrdLoop, createOpenCodeAgent } from "gateproof/prd";

await runPrdLoop("./prd.ts", {
  agent: createOpenCodeAgent({ apiKey: process.env.OPENCODE_ZEN_API_KEY }),
  maxIterations: 7,
});
```

## Shorthands (less boilerplate)

> Contributed by @grok

```ts
import { gate, noErrors, hasAction, browserAct, cloudflare } from "gateproof/shorthands";

const result = await gate("user-signup", {
  observe: cloudflare.logs({ dataset: "worker_logs" }),
  act: browserAct.goto("https://app.example.com/signup"),
  assert: [noErrors(), hasAction("user_created")],
});
```

## Generate a PRD from plain language

```bash
echo "Build a signup flow with email verification" | npx gateproof prdts --stdout
```

## End-to-end CLI pipeline

> Contributed by @grok

```bash
# Natural language → prd.ts → agent loop
echo "Build a signup flow with email verification" | npx gateproof prdts --out prd.ts
npx gateproof smoke ./prd.ts
bun run prd.ts
```

## Docs

Full documentation, tutorials, and API reference: [gateproof.dev/docs](https://gateproof.dev/docs)

## License

MIT
