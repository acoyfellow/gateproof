# PRD Patterns

## Story Structure

Every story has:
- `id`: kebab-case identifier (e.g., "user-signup")
- `title`: Human-readable description of what should exist
- `gateFile`: Path to the gate that verifies this story
- `dependsOn`: (optional) Array of story IDs that must pass first
- `scope`: (optional) Constraints on what code can change

## Dependency Patterns

### Linear Chain
Each story depends on the previous:

```typescript
const stories = [
  { id: "setup-db", gateFile: "gates/setup-db.gate.ts" },
  { id: "create-user", gateFile: "gates/create-user.gate.ts", dependsOn: ["setup-db"] },
  { id: "verify-email", gateFile: "gates/verify-email.gate.ts", dependsOn: ["create-user"] },
  { id: "user-login", gateFile: "gates/user-login.gate.ts", dependsOn: ["verify-email"] },
];
```

### Diamond (Converging)
Multiple stories depend on the same prerequisite, then converge:

```typescript
const stories = [
  { id: "auth-setup", gateFile: "gates/auth-setup.gate.ts" },
  { id: "oauth-google", gateFile: "gates/oauth-google.gate.ts", dependsOn: ["auth-setup"] },
  { id: "oauth-github", gateFile: "gates/oauth-github.gate.ts", dependsOn: ["auth-setup"] },
  { id: "unified-login", gateFile: "gates/unified-login.gate.ts", dependsOn: ["oauth-google", "oauth-github"] },
];
```

### Parallel Tracks
Independent features that don't depend on each other:

```typescript
const stories = [
  // Auth track
  { id: "user-signup", gateFile: "gates/user-signup.gate.ts" },
  { id: "user-login", gateFile: "gates/user-login.gate.ts", dependsOn: ["user-signup"] },

  // Payment track (independent)
  { id: "payment-setup", gateFile: "gates/payment-setup.gate.ts" },
  { id: "checkout", gateFile: "gates/checkout.gate.ts", dependsOn: ["payment-setup"] },

  // Final integration
  { id: "paid-user-flow", gateFile: "gates/paid-user.gate.ts", dependsOn: ["user-login", "checkout"] },
];
```

## Scope Patterns

### Feature-Scoped
Limit changes to specific directories:

```typescript
{
  id: "auth-refactor",
  gateFile: "gates/auth-refactor.gate.ts",
  scope: {
    allowedPaths: ["src/auth/**", "src/middleware/auth.ts"],
    forbiddenPaths: ["src/core/**"],
  },
}
```

### Size-Limited
Prevent runaway changes:

```typescript
{
  id: "small-fix",
  gateFile: "gates/small-fix.gate.ts",
  scope: {
    maxChangedFiles: 3,
    maxChangedLines: 50,
  },
}
```

### Protected Core
Ensure critical files aren't touched:

```typescript
{
  id: "new-feature",
  gateFile: "gates/new-feature.gate.ts",
  scope: {
    forbiddenPaths: [
      "src/core/**",
      "*.config.*",
      "package.json",
      ".env*",
    ],
  },
}
```

## PRD Anti-Patterns

**Avoid:**
- Circular dependencies (A depends on B, B depends on A)
- Stories without gates (intent without verification)
- Overly broad scope (no constraints = accidents)
- Too many dependencies per story (hard to debug failures)

**Prefer:**
- Linear or diamond patterns
- One clear responsibility per story
- Explicit scope constraints
- Stories that can be tested independently
