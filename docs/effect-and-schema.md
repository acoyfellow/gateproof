# Effect and Schema: Gateproof's Foundation

## Effect as the Runtime Spine

Effect is Gateproof's internal runtime discipline. It provides:

- **Typed failure**: All errors are typed and composable. Gate failures, observability errors, and action errors are distinct types that compose predictably.
- **Structured concurrency**: Actions, log collection, and assertions run within Effect's structured concurrency model. Cancellation propagates correctly.
- **Retries, timeouts, cancellation**: Built-in primitives for retry schedules, timeout handling, and cancellation. Actions can be retried with exponential backoff; log collection respects idle and max timeouts.
- **Resource safety**: Backends are acquired and released via `acquireUseRelease`. Browser instances, log streams, and network connections are guaranteed cleanup.

Gateproof's `Gate.run` is implemented as an Effect. The public API returns a Promise, but internally everything is Effect.

## Schema: What We Standardize (Today)

Effect is the runtime discipline inside Gateproof. Schema is used primarily for **tagged error types** (e.g. assertion failures, observability errors) so failures are structured and composable.

### PRD “Capsule” Shape (simple, explicit)

Gateproof ships an optional PRD runner (`gateproof/prd`). If you use it, your PRD must match a small shape:

- Story: `id`, `title`, `gateFile`, `dependsOn?`, `progress?`
- PRD: `{ stories: Story[] }`

Validation today is intentionally boring:
- Dependency existence + cycle detection (in the runner)
- Gate file exists + exports `run()` (in `scripts/prd-validate.ts`)
- `progress` (if present) must be a list of strings (in `scripts/prd-validate.ts`)

Gateproof does **not** own your PRD’s intent or state. It doesn’t mutate the PRD. It only uses the capsule shape if you opt into the runner/validator.
The optional `progress` field is a list of human/agent checkpoints; gateproof treats it as opaque metadata.

### Gate Result/Evidence Contract

The `GateResult` shape is standardized as a TypeScript type:

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

## Future-Proofing: PRD Sharding (idea, not shipped)

This is an idea worth preserving, but it’s not implemented in the current codebase.

**The invariant**: A fresh agent only needs the actionable slice (e.g. stories not yet done, however you track that).

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
