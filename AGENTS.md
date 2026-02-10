# Agent Guidelines for Gateproof

This document provides instructions for AI agents working with gateproof-based projects.

## Quick Start

1. **Read `prd.ts` first** - This is your source of truth. It defines what needs to pass.
2. **Run gates to understand current state** - Use `bun run prd.ts` to see what's failing.
3. **Fix one failing story at a time** - Focus on the first failing gate.
4. **Verify your fix** - Re-run the PRD to confirm the gate passes.

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
# Run all gates
bun run prd.ts

# Run smoke test (validates setup without agent loop)
npx gateproof smoke ./prd.ts

# Run with scope checking enabled
bun run prd.ts --check-scope
```

## Understanding Gate Output

Gate results include structured evidence:

```json
{
  "status": "failed",
  "evidence": {
    "actionsSeen": ["page_load"],
    "stagesSeen": ["worker"],
    "errorTags": ["ValidationError"]
  },
  "error": {
    "name": "AssertionFailed",
    "message": "HasAction: missing 'user_created'"
  }
}
```

**Use this to diagnose:**
- `actionsSeen` - What actions were logged
- `stagesSeen` - What stages/components ran
- `errorTags` - What errors occurred
- `error.message` - The exact assertion that failed

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

## Working with the PRD Loop

When integrated with `runPrdLoop`, you'll receive context about failures:

```typescript
const result = await runPrdLoop("./prd.ts", {
  agent: async (ctx) => {
    // ctx.prdSlice      - Relevant story details
    // ctx.failureSummary - What failed and why
    // ctx.recentDiff    - Recent git changes
    // ctx.failedStory   - The Story object that failed

    // Make targeted fixes...
    return { changes: ["Fixed validation in signup.ts"] };
  },
});
```

## File Structure Conventions

```
project/
├── prd.ts              # PRD definition (read this first!)
├── gates/              # Gate implementations
│   └── *.gate.ts       # Each exports async run() -> GateResult
├── .gateproof/
│   ├── prd-report.json # Last run report
│   ├── evidence.log    # Historical evidence across iterations
│   └── scope.defaults.json # Project-specific scope defaults
└── src/                # Source code to modify
```

## Tips for Success

1. **Read before writing** - Understand existing code patterns.
2. **Trust the gate** - If it fails, something is actually wrong.
3. **Check the evidence** - The logs tell you what happened.
4. **Stay in scope** - Respect the boundaries defined in the story.
5. **Prefer iteration** - Small fixes, verify, repeat.

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

## Getting Help

- Gate keeps timing out? Check observe resource configuration.
- Assertion unclear? Read the gate file to understand expected behavior.
- Scope too restrictive? Ask the user to adjust `allowedPaths`.

Remember: **The gate is the truth.** Your job is to make it pass.
