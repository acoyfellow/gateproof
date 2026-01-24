# Agent-first spec interview → PRD stories

Keep context small. Turn intent into a few stories, then let gates prove reality.

## Spec interview

Run a short, two-way interview before writing any code. The goal is crisp intent, not a long spec.

Prompt starter:
```
Let's interview each other about this feature. Ask me the minimum set of questions
needed to write PRD stories with gates.
```

## Output: PRD stories

Produce a few stories with clear IDs and gate files. Each story is a checklist item
that only becomes "done" when its gate passes.

Example shape:
```
{
  id: "user-signup",
  title: "User can sign up",
  gateFile: "./gates/user-signup.gate.ts",
}
```

## Guardrails

- Keep PRD stories short (ideally 3-7 per run).
- Prefer linear or diamond dependencies; avoid deep chains.
- Cap scope with allowed paths and max change limits.

## Evidence-first gates

Use Evidence-first assertions: require positive signals like `Assert.hasAction(...)`,
not only `Assert.noErrors()`.
