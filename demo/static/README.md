# gateproof

Write your stories with gates. Make your PRD executable. Reality decides when you can move forward.

## What is a story?

A story is a requirement. "User can sign up." "API responds without errors." "Deploy works."

Stories live in your PRD (Product Requirements Document). Traditionally, stories are prose. They're marked "done" when someone says they're done.

## What is a gate?

A gate is executable verification. It observes logs, runs actions, asserts results.

A gate file uses gateproof's API:

```typescript
import { Gate, Act, Assert } from "gateproof";

const result = await Gate.run({
  name: "user-signup",
  observe: provider.observe({ backend: "analytics" }),
  act: [Act.browser({ url: "https://app.example.com/signup" })],
  assert: [Assert.noErrors(), Assert.hasAction("user_created")]
});

if (result.status !== "success") process.exit(1);
```

## Make your PRD executable

Your PRD defines stories. Each story references a gate file. The gate file verifies the story.

Stories carry state. The PRD tracks which stories are pending, in progress, or done. gateproof does not manage this state. It only enforces: proceed only when gates pass.

```typescript
// prd.ts
export const stories = [
  {
    id: "user-signup",
    title: "User can sign up",
    gateFile: "./gates/user-signup.gate.ts",
    status: "pending"
  }
];
```

gateproof does not parse or own your PRD. It's your repo's artifact. You decide the format. gateproof only executes the gate files your PRD references.

## The workflow

1. Update PRD story
2. Implement the change
3. Run the gate: `bun run gates/user-signup.gate.ts`
4. Gate fails? Work halts. Fix the issue. Rerun the gate.
5. Gate passes? Mark story "done". Proceed.

Progress is not declared. It is proven.

## Terminal example

Work halts on failure:

```
$ bun run gates/user-signup.gate.ts

Running gate: user-signup
Observing logs...
Acting: browser navigation to /signup
Checking assertions...

Gate failed. Stop here.
Error: No action "user_created" found in logs.

Fix the issue. Rerun the gate. Only proceed when it passes.
```

Fix the bug. Rerun:

```
$ bun run gates/user-signup.gate.ts

Running gate: user-signup
Observing logs...
Acting: browser navigation to /signup
Checking assertions...

Gate passed. You may proceed.
Duration: 1234ms
Actions: user_created, signup_complete
```

## Three concepts

**Gate**: Executable verification. Observe logs, run actions, assert results.

**Act**: Actions to perform. Browser automation, shell commands, waits.

**Assert**: Validations to check. No errors, has action, has stage, custom assertions.

gateproof executes gates. It does not define intent, plans, or workflows.

You define gates. gateproof executes them.
