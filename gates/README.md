# Gates

Gates are proof points your system must pass through. The file tree IS the deterministic tree.

## The File Tree IS The Gate Tree

```
gates/
├── production/          # Branch: Production environment
│   └── smoke.gate.ts   # Checkpoint: Must pass
├── local/               # Branch: Local development
│   └── demo.gate.ts    # Checkpoint: Must pass
└── framework/           # Branch: Framework integrity
    └── integrity.gate.ts # Checkpoint: Framework tests itself
```

**Directories = branches. Gate files = checkpoints. The path = the deterministic path.**

## Gate File Structure

```typescript
#!/usr/bin/env bun
import { Gate, Act, Assert } from "../../src/index";
import { createEmptyObserveResource } from "../../src/utils";

const gate = {
  name: "my-gate",
  observe: createEmptyObserveResource(),
  act: [Act.wait(500)],
  assert: [Assert.custom("validation", async () => true)],
  stop: { idleMs: 1000, maxMs: 10000 }
};

const result = await Gate.run(gate);
process.exit(result.status === "success" ? 0 : 1);
```

## Running Gates

```bash
# Run a specific gate
bun run gates/production/smoke.gate.ts

# Run all gates in a branch
bun run gates/production/*.gate.ts
```

## Organizing Gates

Organize by context: environment, feature, or concern. The structure IS the specification.

- One gate per file
- Descriptive names: `smoke.gate.ts`, not `test1.gate.ts`
- Directories group related gates
- Paths are meaningful: `gates/production/api.gate.ts` tells you what it validates

The file tree makes the deterministic path visible and executable.
