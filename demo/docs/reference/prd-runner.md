# PRD Runner Reference

## PRD capsule shape

```ts
{
  stories: [
    {
      id: "story-id",
      title: "Behavior — evidence: action — scope: path",
      gateFile: "./gates/story.gate.ts",
      dependsOn?: ["other-story"],
      progress?: ["checkpoint"],
      scope?: {
        allowedPaths?: string[],
        forbiddenPaths?: string[],
        maxChangedFiles?: number,
        maxChangedLines?: number,
      },
    }
  ]
}
```

## Runner behavior

- Validates dependency existence and cycles
- Topologically sorts by `dependsOn`
- Executes gates in order
- Stops on first failure

## DAG Visualization of Dependencies

> Contributed by @grok

The runner resolves stories as a directed acyclic graph (DAG). Visualizing dependencies helps catch design issues early.

### Linear chain

```
setup-db ──> create-user ──> verify-email ──> user-login
```

### Diamond (converging)

```
              ┌── oauth-google ──┐
auth-setup ──┤                    ├──> unified-login
              └── oauth-github ──┘
```

### Parallel tracks with final merge

```
user-signup ──> user-login ──────────┐
                                      ├──> paid-user-flow
payment-setup ──> checkout ──────────┘
```

### Mapping your own PRD

Read your `prd.ts` and draw the graph by tracing `dependsOn` edges:

```
for each story S in prd.stories:
  if S.dependsOn:
    for each dep in S.dependsOn:
      dep ──> S
  else:
    S is a root node (no incoming edges)
```

Stories with no `dependsOn` are roots (executed first). Stories that no other story depends on are leaves. The runner executes in topological order, stopping on first failure.

## Validator

`bun run prd:validate` checks:

- Gate files exist and export `run()`
- `progress` (if present) is a list of strings

## Example

```ts
import { definePrd, runPrd } from "gateproof/prd";

const prd = definePrd({
  stories: [
    {
      id: "story-1",
      title: "First story — evidence: done — scope: src/**",
      gateFile: "./gates/story-1.gate.ts",
    },
  ] as const,
});

const result = await runPrd(prd);
if (!result.success) process.exit(1);
```
