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
