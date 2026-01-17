# Gates

Gates are proof points that your system must pass through. They're not just tests—they're **gates** that validate your system meets its requirements.

## Philosophy

> "Building software in reverse" means defining the gates first, then building to pass through them.

Gates define:
- **What** must be true (assertions)
- **How** to verify it (actions)
- **When** it's proven (observations)

## Directory Structure

```
gates/
├── README.md              # This file
├── production/            # Production environment gates
│   └── smoke.gate.ts      # Smoke tests for production
├── local/                 # Local development gates
│   └── demo.gate.ts      # Local demo validation
└── demo/                  # Demo-specific gates
    └── integration.gate.ts # Integration scenarios
```

## Gate File Naming

Gates follow the pattern: `{name}.gate.ts`

Examples:
- `smoke.gate.ts` - Quick validation gates
- `api.gate.ts` - API endpoint gates
- `e2e.gate.ts` - End-to-end flow gates
- `performance.gate.ts` - Performance validation gates

## Gate Structure

A gate file should:

1. **Be executable** - Can be run directly with `bun run gates/.../name.gate.ts`
2. **Have clear purpose** - Document what it's proving
3. **Use Gate Proof** - Import and use `Gate`, `Act`, `Assert`
4. **Exit with code** - `process.exit(0)` on success, `process.exit(1)` on failure

## Example Gate

```typescript
#!/usr/bin/env bun
import { Gate, Act, Assert } from "../../src/index";
import { createObserveResource } from "../../src/observe";
import { Effect } from "effect";

const gate = {
  name: "my-gate",
  observe: createObserveResource(emptyBackend),
  act: [
    Act.wait(500),
    // Add actions here
  ],
  assert: [
    Assert.custom("my_assertion", async () => {
      // Validate something
      return true;
    }),
  ],
  stop: { idleMs: 1000, maxMs: 10000 },
};

const result = await Gate.run(gate);
if (result.status !== "success") {
  process.exit(1);
}
```

## Running Gates

```bash
# Run a specific gate
bun run gates/production/smoke.gate.ts

# Run all production gates
bun run gates/production/*.gate.ts

# Run all gates (if you set up a script)
bun run gates:all
```

## Gate Categories

### Production Gates
Gates that validate production deployments. These should be:
- Fast (smoke tests)
- Reliable (not flaky)
- Critical (block deployment if they fail)

### Local Gates
Gates for local development. These can be:
- More comprehensive
- Slower (integration tests)
- Educational (show how things work)

### Demo Gates
Gates that demonstrate gateproof capabilities. These:
- Show patterns and best practices
- Are well-documented
- Can be used as examples

## Best Practices

1. **One gate per file** - Keep gates focused and single-purpose
2. **Descriptive names** - `smoke.gate.ts` not `test1.gate.ts`
3. **Clear documentation** - Explain what the gate proves
4. **Environment variables** - Use env vars for configuration
5. **Graceful failures** - Provide clear error messages
6. **Fast feedback** - Gates should run quickly when possible

## Terminology

- **Gate** - A proof point that must pass
- **Action** - Something the gate does (Act.wait, Act.browser, etc.)
- **Assertion** - What the gate validates (Assert.custom, Assert.hasAction, etc.)
- **Evidence** - What the gate observed (logs, requestIds, etc.)
- **Pass** - Gate succeeded ✅
- **Fail** - Gate failed ❌

Remember: You're not writing tests, you're **defining gates** that your system must pass through.
