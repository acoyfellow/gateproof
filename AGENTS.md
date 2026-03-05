# Agent Guidelines for Gateproof

This document provides instructions for AI agents working with gateproof-based projects.

## Quick Start

1. **Read `plan.ts` first** - This is your source of truth. It contains the handoff context and the executable plan.
2. **Run the plan to understand current state** - Use `bun run plan.ts` to see what's failing.
3. **Fix one failing story at a time** - Focus on the first failing gate.
4. **Verify your fix** - Re-run the plan to confirm the gate passes.

## Core Principles

### 1. Scope Constraints

Stories may have `scope` constraints. **Always respect them:**

```typescript
scope: {
  allowedPaths: ["src/", "app/"],      // Only modify files in these paths
  forbiddenPaths: ["node_modules/"],    // Never touch these
  maxChangedFiles: 5,                   // Limit total files changed
  maxChangedLines: 100,                 // Limit total lines changed
}
```

If no scope is defined, use sensible defaults:
- **Allowed**: `src/`, `app/`, `components/`, `pages/`, `lib/`
- **Forbidden**: `node_modules/`, `.git/`, `dist/`, `build/`, `.env`

### 2. Minimal Diffs

- **Fix only what's broken** - Don't refactor unrelated code.
- **Keep changes small** - Prefer surgical fixes over rewrites.
- **One logical change per commit** - Makes it easier to debug and revert.

### 3. Gate-Driven Development

Gates are the acceptance criteria. A story is complete when its gate passes.

```bash
# Run the plan
bun run plan.ts

# Re-generate the local README from the same source
bun run readme:generate
```

## Understanding Gate Output

Gate results include structured evidence:

```json
{
  "status": "fail",
  "summary": "one or more gates failed",
  "evidence": {
    "actions": [],
    "http": {
      "status": 500
    },
    "logs": [
      {
        "action": "webhook_received",
        "stage": "worker"
      }
    ],
    "errors": [
      "expected HTTP 200 but observed 500"
    ]
  }
}
```

**Use this to diagnose:**
- `actions` - What shell actions ran and whether they succeeded
- `http` - The latest HTTP observation, if the gate observed a URL
- `logs` - Structured log events, including `action` and `stage` when present
- `errors` - The exact assertion or observation failures

## Common Patterns

### Fixing a Failing Assertion

1. Read the gate file to understand what's expected:
   ```typescript
   assert: [
     Assert.hasAction("user_created"),  // Expects this action in logs
     Assert.noErrors(),                  // Expects no error logs
   ]
   ```

2. Find where the action should be logged in the source code.

3. Ensure the code path that logs `user_created` is reachable.

4. Run the gate again to verify.

### Fixing a Timeout

Timeouts usually mean the expected logs never arrived.

1. Check if the action is being executed (look at `Act` config).
2. Verify the observe resource is configured correctly.
3. Check if the log format matches what assertions expect.

### Fixing Scope Violations

```
Scope violation: changed forbidden path 'node_modules/package.json'
```

Your change touched a forbidden path. Options:
1. Find an alternative approach that stays within allowed paths.
2. Ask the user to expand the scope if the change is necessary.

## Working with the Plan Loop

When integrated with `Plan.runLoop`, you'll receive context about failures:

```typescript
const result = await Effect.runPromise(Plan.runLoop(scope.plan, {
  worker: (ctx) => Effect.succeed({
    // ctx.plan        - The executable plan
    // ctx.result      - The latest plan result
    // ctx.failedGoals - The Goal objects that failed
    // ctx.firstFailedGoal - The first failing goal to target

    // Make targeted fixes...
    changes: [{ kind: "replace", path: "src/signup.ts", summary: "Fixed validation in signup.ts" }],
    summary: "Applied one targeted fix",
  }),
}));
```

## File Structure Conventions

```
project/
├── plan.ts             # One-file handoff (read this first!)
├── README.md           # Generated from plan.ts
├── src/                # Gateproof runtime
├── scripts/            # Repo-local generators
└── demo/               # Demo app that consumes the same source
```

## Tips for Success

1. **Read before writing** - Understand existing code patterns.
2. **Trust the gate** - If it fails, something is actually wrong.
3. **Check the evidence** - The logs tell you what happened.
4. **Stay in scope** - Respect the boundaries defined in the story.
5. **Prefer iteration** - Small fixes, verify, repeat.

## End-of-Turn Policy

1. Finish the requested work.
2. Run the repo quality check with `bun run quality:check`.
3. If it passes, finalize the turn with `bun run turn:finalize`.
4. If it fails, do not commit.
5. A turn is not complete until one of those outcomes is explicit.

## Environment Variables

```bash
CLOUDFLARE_ACCOUNT_ID   # For Cloudflare observe resources
CLOUDFLARE_API_TOKEN    # For Cloudflare API access
OPENCODE_ZEN_API_KEY    # For PRD generation
API_URL                 # Base URL for API gates
TEST_URL                # Base URL for test gates
```

## Error Recovery

If you break something:

1. Check git status to see what changed.
2. Revert problematic changes with `git checkout <file>`.
3. Start fresh from a known good state.

## Northstar: Cloudflare Install Blueprint

`plan.ts` is not just a proof harness—it is a **declarative install specification**. The northstar: a Cloudflare "Install" button that deploys a Gateproof-described system to Workers/infra in one click.

**Mental model**:
- plan.ts describes: workers, routes, KV/R2/DOs, bindings, and **what must be true** (assertions)
- A compiler reads plan.ts and emits: Cloudflare config (wrangler, resources) + gate definitions
- Deploy via Cloudflare API → run gates → proof and evidence

**Anti-pattern (learned from Cinder case study)**: Do not encode app logic or long inline scripts in plan.ts. The plan specifies behavior and resources; implementation lives in app code. Keep plan.ts focused on *what exists* and *what must be true*, not *how to provision*.

## Getting Help

- Gate keeps timing out? Check observe resource configuration.
- Assertion unclear? Read the gate file to understand expected behavior.
- Scope too restrictive? Ask the user to adjust `allowedPaths`.

Remember: **The gate is the truth.** Your job is to make it pass.
