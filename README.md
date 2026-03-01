# gateproof

Reverse-build software from `prd.ts`. Loop until the gates pass.

Gateproof is for writing down what "done" looks like first, then letting real checkpoints pull the code toward that reality.

Write stories. Attach gates. Let the loop keep working until reality matches intent.

A **story** is a piece of intended reality. A **gate** is a real-world checkpoint that asks, "is this actually true yet?" A **prd.ts** is the ordered source of truth. The loop reads the plan, finds the next failing gate, makes a change, and runs again.

## The north star

The goal is not to write tests.

The goal is to make `prd.ts` true.

Everything else is in service of that:

- stories break the vision into steps
- gates check whether each step is real yet
- the loop keeps pulling the code toward the next passing gate

If you need the one-line explanation:

**Write what done looks like in `prd.ts`, then loop until the gates prove it's real.**

## The idea

Plans are solid. Implementation is liquid.

You already know what you want before you know exactly how to build it. `prd.ts` captures that. Gates keep that intent grounded in reality.

Once a gate passes, you have enough proof from the real system to believe that part is working. The loop can move on to the next broken thing. That is the whole trick.

## The workflow

Gateproof is built around four simple parts:

1. **`prd.ts`** — the map of where the software is supposed to end up
2. **Stories** — the chunks of reality you want to become true
3. **Gates** — checkpoints that verify those chunks in the real world
4. **Loop** — keep fixing the next failing gate until the plan is real

You can make gates weak or strong.

- A weak gate says "nothing broke."
- A strong gate says "the thing I wanted actually happened."

Gateproof is about writing stronger gates, so agents are pulled by reality instead of pushing code forward blindly.

## Install

```bash
bun add gateproof
```

## Minimal gate

```ts
import {
  Gate,
  Evidence,
  Expectation,
  Report,
  type GateDefinition,
} from "gateproof";

const definition: GateDefinition = {
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
    minProofStrength: "strong",
  },
};

const gate = Gate.define(definition);

const result = await gate.run({
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

The practical flow is:

1. Write `prd.ts`
2. Add the next gate
3. Run the loop
4. Fix whatever the gate proves is still false
5. Repeat until the PRD is real

## Low-level log gates

If you want direct control over logs, browser actions, or shell steps, the original low-level runtime is still there.

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

## Advanced: gate an agent runtime

If you want, Gateproof can also watch an agent runtime and gate what the agent actually does.

The Filepath bridge is one advanced way to do that. It is not the core idea. The core idea is still simple: `prd.ts` says what should be true, and gates check whether it is true yet.

```ts
import {
  Gate,
  Act,
  Assert,
  CloudflareSandboxRuntime,
  createFilepathObserveResource,
} from "gateproof";
import { getSandbox } from "@cloudflare/sandbox";

const runtime = new CloudflareSandboxRuntime({
  getSandbox: (config) => getSandbox(env.Sandbox, `agent-${config.name}`),
});

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

**A good gate is grounded.** Ask: "what broken implementation would still pass this gate?" If the answer is "many," the gate is too weak. Tighten it until a broken system fails.

**Start narrow, then widen.** One specific assertion that catches a real failure is worth more than ten vague ones. You can always add assertions later — you can't take back a false pass.

## The loop

Gate fails. Agent reads the proof. Agent fixes code. Gate re-runs. Loop until pass.

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
