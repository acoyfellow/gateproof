# Preflight Boundary

## Overview

The preflight boundary is a language-to-action safety check that validates whether it's safe to proceed with an action **before** any side effects occur. It bridges the gap between intention (what an agent wants to do) and execution (actually doing it).

## The Problem

Agents sometimes:
- Hallucinate how to call a tool
- Guess side effects because documentation is unclear
- Proceed with destructive actions based on incomplete information
- Miss documented constraints or failure modes

The preflight boundary solves this by evaluating documentation quality and safety before any action is taken.

## Decisions

Preflight returns one of three decisions:

- **ALLOW**: Everything is explicit and safe—proceed with confidence
- **ASK**: Intent is legible but details are missing—clarify first
- **DENY**: Intent is unclear or side effects are ambiguous—do not proceed

## API

### Basic Usage

```typescript
import { Preflight } from "gateproof";
import { Effect } from "effect";

const result = await Effect.runPromise(
  Preflight.check({
    url: "https://docs.example.com/api",
    intent: "delete user data",
    action: "delete"
  })
);

console.log(result.decision);      // "ALLOW" | "ASK" | "DENY"
console.log(result.justification); // Human-readable explanation
console.log(result.questions);     // Array of clarifications (if decision is "ASK")
```

### PreflightSpec

```typescript
interface PreflightSpec {
  url: string;        // Where to fetch the documentation
  intent: string;     // What the agent intends to do
  action: PreflightAction; // "read" | "write" | "delete" | "execute"
  modelId?: string;   // Optional: override default LLM
}
```

### PreflightResult

```typescript
interface PreflightResult {
  decision: "ALLOW" | "ASK" | "DENY";
  justification: string;
  questions?: string[]; // Present when decision is "ASK"
}
```

## Integration with Gates

Preflight can be integrated directly into gates to add pre-action validation:

```typescript
import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

const provider = CloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken: process.env.CLOUDFLARE_API_TOKEN!
});

const result = await Gate.run({
  name: "safe-delete-gate",
  
  // Preflight runs BEFORE actions
  preflight: {
    url: "https://api.example.com/docs/delete",
    intent: "delete temporary cache entries",
    action: "delete"
  },
  
  // If preflight returns DENY, these won't execute
  observe: provider.observe({ backend: "analytics", dataset: "worker_logs" }),
  act: [Act.exec("./cleanup.sh")],
  assert: [Assert.noErrors()]
});

if (result.status === "success") {
  console.log("✅ Gate passed with preflight validation");
} else {
  console.log("❌ Gate failed:", result.error);
}
```

## Decision Criteria

The preflight boundary evaluates these rules in order:

### 1. Intent Validation
Is the agent's intent clearly mapped to a documented capability?
- **Pass**: Intent matches documented feature
- **Fail**: Intent not documented → DENY

### 2. Authority Check
Are credentials/identity requirements documented?
- **Pass**: Authority is documented
- **Ask**: Missing for non-read operations → ASK
- **Fail**: Missing for sensitive operations → DENY

### 3. Effect Bounding
Are side effects clearly bounded?
- **Pass**: Effects are clearly scoped
- **Ask**: Some ambiguity → ASK
- **Fail**: Unbounded effects → DENY

### 4. Failure Semantics
Are failure modes documented?
- **Pass**: Failures are explained
- **Ask**: Partial failure docs → ASK
- **Fail**: No failure documentation → DENY

### 5. Reversibility
For destructive actions, is reversibility documented?
- **Pass**: Reversibility is clear
- **Ask**: Unclear reversibility → ASK
- **Fail**: Irreversible without documentation → DENY

### 6. Invocation Integrity
Is the invocation pattern (parameters, syntax) documented?
- **Pass**: Full invocation docs
- **Ask**: Partial invocation docs → ASK
- **Fail**: No invocation docs → DENY

### 7. Uncertainty vs. Consequence
Do unanswered questions outweigh potential harm?
- **Allow**: Low uncertainty, clear documentation
- **Ask**: Some uncertainty, medium consequences
- **Deny**: High uncertainty, high consequences

## Action Types

Different action types have different risk levels:

### Read
Least restrictive. Focuses on:
- Can the operation be performed?
- Are credentials documented?

### Write
Moderately restrictive. Adds:
- Are side effects bounded?
- Is the operation reversible?

### Delete
Most restrictive. Requires:
- Clear reversibility documentation
- Explicit effect boundaries
- Documented failure modes

### Execute
Similar to write/delete. Requires:
- Clear side effect documentation
- Failure mode documentation
- Authority requirements

## Examples

### Example 1: ALLOW Decision

```typescript
// Well-documented read operation
const result = await Effect.runPromise(
  Preflight.check({
    url: "https://api.example.com/docs/read-user",
    intent: "read user profile data",
    action: "read"
  })
);
// Expected: ALLOW
// Justification: "All safety checks passed - intent, authority, effects, and invocation are clearly documented"
```

### Example 2: ASK Decision

```typescript
// Operation with partial documentation
const result = await Effect.runPromise(
  Preflight.check({
    url: "https://api.example.com/docs/write-config",
    intent: "update configuration settings",
    action: "write"
  })
);
// Expected: ASK
// Justification: "Intent is clear but specific details need clarification"
// Questions: [
//   "What are the exact boundaries and limits of this operation's side effects?",
//   "What are the exact parameters and invocation syntax for this operation?"
// ]
```

### Example 3: DENY Decision

```typescript
// Destructive operation with poor documentation
const result = await Effect.runPromise(
  Preflight.check({
    url: "https://api.example.com/docs/incomplete",
    intent: "permanently delete all user data",
    action: "delete"
  })
);
// Expected: DENY
// Justification: "Intent is not clearly mapped to a documented capability"
// or "Side effects are not clearly bounded in the documentation"
// or "Reversibility is not documented for this potentially destructive action"
```

## Handling Decisions

### ALLOW

```typescript
if (result.decision === "ALLOW") {
  console.log("✅ Safe to proceed");
  // Execute the action
}
```

### ASK

```typescript
if (result.decision === "ASK") {
  console.log("⚠️  Clarification needed");
  console.log(result.justification);
  result.questions?.forEach((q, i) => {
    console.log(`${i + 1}. ${q}`);
  });
  // Collect answers and either:
  // - Update documentation
  // - Provide more context
  // - Retry with additional information
}
```

### DENY

```typescript
if (result.decision === "DENY") {
  console.log("❌ Action blocked");
  console.log(result.justification);
  // Do not proceed
  // Log the denial
  // Review and improve documentation
}
```

## Current Implementation

The current implementation includes:

1. **Mock LLM Extraction**: A simulated documentation extractor that returns structured data
2. **Decision Logic**: Complete evaluation of all safety criteria
3. **Gate Integration**: Seamless integration with the Gate.run pipeline

### Future Enhancements

Future versions may include:

1. **Real LLM Integration**: Connect to OpenCode Zen or similar services for actual doc extraction
2. **Confidence Tuning**: Adjust confidence thresholds for different risk levels
3. **Custom Rules**: Allow users to define custom evaluation rules
4. **Caching**: Cache extraction results to avoid repeated LLM calls
5. **Async Clarification**: Pause execution and wait for human input when decision is ASK

## Philosophy

The preflight boundary embodies the principle of **building software in reverse**, but takes it one step further. Before you even write the gate, before you even run the action, the preflight boundary asks: "Is this safe?"

It's the bridge from intention to execution. It's the moment where language meets action. It's the guard at the gate.

**Traditional flow**: Intent → Action → Hope it works

**Gateproof flow**: Intent → Observe → Act → Assert → Prove it works

**Preflight-enhanced flow**: Intent → **Preflight Check** → Observe → Act → Assert → Prove it works

The preflight boundary closes the last gap: ensuring that the *intent itself* is safe and well-understood before any side effects occur.

## See Also

- [Basic Preflight Pattern](/patterns/basic/preflight-boundary.ts) - Complete usage examples
- [Gate Proof README](/README.md) - Main documentation
- [Act Documentation](/src/act.ts) - Action types
- [Assert Documentation](/src/assert.ts) - Assertion types
