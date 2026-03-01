# gateproof

Gateproof is a product-claim verifier. It encodes launch-critical claims as executable contracts, runs them against real systems, and returns evidence-backed results.

Software is built in reverse. You know what you want before you know how to get there. Gateproof turns that into a workflow you can actually run.

Write claims. Attach evidence. Let agents iterate until reality matches intent.

A **claim** states what the product must prove in real conditions. It can set up preconditions, exercise the system, collect explicit evidence, and evaluate an expectation. A **gate** is still available as the low-level runtime primitive. A **story** is a gate or claim with a name and a place in a plan. A **prd.ts** is a list of stories in dependency order. The agent's only job is to make the next failing claim pass honestly.

## The thesis

Plans are solid. Implementation is liquid.

Any codebase can be scoped down to stories and a `prd.ts`. Multiple agents can work the same plan, falling through the same checkpoints. Once a gate passes, previous work can't break -- the gate proves it. The skill shifts from writing code to defining the right guardrails.

Gates are checkpoints that keep agents safe. They don't decide intent. They verify reality.

## Why this works

Formal verification research established that the relationship between a specification and its implementation — called **refinement** — is itself a testable property. You don't need a theorem prover to get value from this idea. You can test refinement cheaply by running the system and checking that its behavior satisfies the spec.

Gateproof distills this into four practical ideas:

1. **Claim** — state the product behavior that must hold
2. **Evidence** — collect real, explicit signals from a running system
3. **Expectation** — check whether the evidence satisfies the claim
4. **Report** — return a readable, machine-serializable result

Each run is a refinement check: does the running system's behavior refine what the claim says? The PRD orders these checks by dependency, so failures localize to the first broken obligation.

This is a deliberate simplification. We trade random input generation and exhaustive coverage for something an engineer can write in minutes and an agent can iterate against in a loop. The gate is the contract. The loop is the proof search.

> Lineage: the *observe → act → assert* pattern draws on property-based testing ideas from [Chen, Rizkallah et al. — "Property-Based Testing: Climbing the Stairway to Verification" (SLE 2022)](https://doi.org/10.1145/3567512.3567520), which demonstrated that refinement properties can serve as a practical, incremental path toward verified systems.

## Install

```bash
bun add gateproof
```

## Minimal claim

```ts
import { Claim, Evidence, Expectation, Report } from "gateproof";

const claim = Claim.define({
  name: "Health endpoint is live",
  intent: "Proves the deployed API responds with HTTP 200",
  exercise: async () => {},
  collect: [
    Evidence.http({
      id: "health-response",
      request: async () => fetch("https://api.example.com/health"),
    }),
  ],
  expect: async (evidence) => {
    const response = evidence[0];
    const status = Number(
      (response?.data as { status?: number } | undefined)?.status ?? 0
    );

    return status === 200
      ? Expectation.ok("health endpoint returned HTTP 200")
      : Expectation.fail("health endpoint failed", { status });
  },
  requirements: {
    minKinds: ["outcome"],
    allowSynthetic: false,
    minProofStrength: "strong",
  },
});

const result = await claim.run({
  env: process.env as Record<string, string | undefined>,
  target: "https://api.example.com",
});

console.log(Report.text(result));
if (result.status !== "pass") process.exit(1);
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

## Low-level gates

The low-level runtime is still available when you need direct control over logs, browser actions, or shell steps.

`Assert.noErrors()`, `Assert.hasAction(name)`, `Assert.hasStage(name)`, `Assert.custom(name, fn)`, `Assert.authority(policy)`.

```ts
import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

const provider = CloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken: process.env.CLOUDFLARE_API_TOKEN!,
});

const result = await Gate.run({
  name: "checkout-flow",
  observe: provider.observe({ backend: "analytics", dataset: "worker_logs" }),
  act: [Act.browser({ url: "https://app.example.com/checkout" })],
  assert: [
    Assert.noErrors(),
    Assert.hasAction("checkout_started"),
    Assert.custom("has-total", (logs) => logs.some(l => (l as { data?: { total?: number } }).data?.total > 0)),
  ],
  stop: { maxMs: 15_000 },
});
if (result.status !== "success") process.exit(1);
```

## Agent gates

Spawn an AI agent in an isolated container, observe its NDJSON event stream, and assert what it's allowed to do.

```ts
import { Gate, Act, Assert } from "gateproof";
import { setFilepathRuntime, CloudflareSandboxRuntime } from "gateproof";
import { getSandbox } from "@cloudflare/sandbox";

// 1. Wire up your container runtime (once at startup)
setFilepathRuntime(new CloudflareSandboxRuntime({
  getSandbox: (config) => getSandbox(env.Sandbox, `agent-${config.name}`),
}));

// 2. Run the gate
const container = await runtime.spawn({
  name: "fix-auth",
  agent: "claude-code",
  model: "claude-sonnet-4-20250514",
  task: "Fix the null pointer in src/auth.ts",
});

const observe = createFilepathObserveResource(container, "fix-auth");

await Gate.run({
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
```

`Assert.authority()` enforces governance policies against the agent's actual behavior — what it committed, spawned, and which tools it used.

## Writing good gates

The hardest part of gateproof is not the library — it's writing gates that actually prove what you think they prove.

**A weak gate passes on silence.** If your system emits no logs and your only assertion is `Assert.noErrors()`, the gate passes vacuously. Nothing was tested. Use `requirePositiveSignal: true` on stories, or assert specific evidence (`Assert.hasAction`, `Assert.hasStage`).

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
