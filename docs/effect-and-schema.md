# Effect and Schema: Gateproof's Foundation

## Effect as the Runtime Spine

Effect is Gateproof's internal runtime discipline. It provides:

- **Typed failure**: All errors are typed and composable. Gate failures, observability errors, and action errors are distinct types that compose predictably.
- **Structured concurrency**: Actions, log collection, and assertions run within Effect's structured concurrency model. Cancellation propagates correctly.
- **Retries, timeouts, cancellation**: Built-in primitives for retry schedules, timeout handling, and cancellation. Actions can be retried with exponential backoff; log collection respects idle and max timeouts.
- **Resource safety**: Backends are acquired and released via `acquireUseRelease`. Browser instances, log streams, and network connections are guaranteed cleanup.

Gateproof's `Gate.run` is implemented as an Effect. The public API returns a Promise, but internally everything is Effect.

## Schema: Two Standardized Surfaces

Schema standardizes exactly two truth-carrying artifacts. Everything else remains user-owned.

### PRD Capsule Compatibility Contract

The PRD capsule shape (`Story + PRD`) is a compatibility contract. Gateproof does not parse or own your PRD, but if you choose to structure it as a capsule, Schema validates the envelope:

- Story shape: `id`, `title`, `gateFile`, `status`, `dependsOn` (optional)
- PRD metadata: version, module boundaries (for future sharding)

This contract enables:
- Validation that gate files exist and are executable
- Future PRD sharding/indexing without rewriting (see Future-proofing)
- Stable parsing for tooling that needs to understand PRD structure

The PRD itself remains user-owned. Gateproof only validates the capsule shape if you use it.

### Gate Result/Evidence Contract

The `GateResult` shape is standardized via Schema:

```typescript
{
  status: "success" | "failed" | "timeout",
  durationMs: number,
  logs: Log[],
  evidence: {
    requestIds: string[],
    stagesSeen: string[],
    actionsSeen: string[],
    errorTags: string[]
  },
  error?: Error
}
```

This contract enables:
- Stable output for audit trails
- Consistent debug/display tooling
- Evidence serialization for CI/CD reports
- Future result aggregation across gates

## What We Are NOT Doing

To keep Gateproof minimal:

- **Not requiring users to learn Effect**: The public API is Promise-based. Users never see Effect types unless they implement custom backends.
- **Not inventing a DSL**: Gates are TypeScript files. No custom syntax, no configuration languages.
- **Not turning Gateproof into a planner/orchestrator**: Gateproof executes gates. It does not decide which gates to run, when to run them, or how to sequence them. The PRD owns intent and state.

## Future-Proofing: PRD Sharding

Schema makes later PRD sharding/indexing possible without rewriting.

**The invariant**: A fresh agent only needs the actionable slice (stories with `status: "pending"` or `status: "in_progress"`).

**The mechanism**: Schema enables:
- **Index PRD**: Contains story IDs, statuses, dependencies, and module references. Small, fast to load.
- **Module PRDs**: Full story details grouped by module/domain. Loaded on-demand when a story becomes actionable.

When an agent needs to work on a story:
1. Load the index PRD (always small)
2. Find the story's module
3. Load only that module's PRD
4. Extract the actionable slice

The Schema contract ensures index and module PRDs are compatible. Gate implementations don't change. The PRD capsule shape remains stable.

This enables scaling to large PRDs (hundreds of stories) without requiring agents to load everything upfront.

## Authority Boundaries

- **PRD owns intent and state**: Stories, dependencies, status tracking. Gateproof never modifies PRD state.
- **Gate implementations own observation**: How logs are collected, which backends are used, what assertions are checked.
- **Gateproof runtime enforces only**: Executes gates, returns evidence. Does not decide what to build or when to proceed.

Effect is the runtime discipline inside Gateproof. Schema stabilizes the two truth-carrying artifacts. Everything else stays optional.
