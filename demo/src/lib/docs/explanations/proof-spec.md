# Explanation: proof-spec.v0

`proof-spec.v0` is a JSON schema for one proof: observe, act, assert. Gateproof and [unsurf](https://github.com/acoyfellow/unsurf) both use it.

- **Gateproof** runs HTTP and shell proofs.
- **unsurf** runs browser (DOM) proofs.

A spec that one tool writes, the other tool can read.

## Convert a plan to specs

```ts
import { planToProofSpecs } from "gateproof";

const specs = planToProofSpecs(plan, (storyId) => ({
  url: `https://example.com/${storyId}`,
}));
```

Each story becomes one spec. The story `id` is the spec `name`. The story `title` is the spec `description`.

## Convert one story or one spec

| Function | From | To |
| --- | --- | --- |
| `goalToProofSpec(story, target)` | `PlanStory` | `ProofSpec` |
| `proofSpecToGoal(spec)` | `ProofSpec` | `PlanStory` |
| `planToProofSpecs(plan, targetFor)` | `PlanDefinition` | `ProofSpec[]` |
| `computeRisk(act)` | actions | `"low"`, `"medium"`, or `"high"` |

`goalToProofSpec` and `proofSpecToGoal` keep their old names for compatibility. They take and return a story.

## What does not convert

- `scope` and `cleanup` have no field in v0. They stay in Gateproof.
- `dependsOn` has no field in v0. Each spec runs alone.
- Only the first spec gets the plan's `loop` settings. `stopOnFailure` is copied only when it is set.
- `Assert.duration` has no v0 equivalent. It is dropped.
- HTTP observe keeps only `url`. `headers` and `pollInterval` are dropped.
- `Cloudflare.observe` becomes a `note` observation that stores the original definition.
- `Act.exec` keeps only `command`. `cwd` and `timeoutMs` are dropped.
- `Assert.httpResponse` keeps only `status`. `actionIncludes` is dropped.
- `Assert.numericDeltaFromEnv` keeps only `baselineEnv` and `minimumDelta`. `source` and `pattern` are dropped.
- If the plan has a `loop` without `maxIterations`, the first spec gets `maxIterations: 1`.
- In `proofSpecToGoal`, only the first HTTP observation and the `exec` actions convert. DOM actions and DOM assertions from unsurf are dropped.
- In `proofSpecToGoal`, `numericDeltaFromEnv` comes back with `source: "httpBody"` and `pattern: "\\d+"`. An `httpResponse` with no `status` is dropped.
