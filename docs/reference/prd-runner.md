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
