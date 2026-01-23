# Patterns

Usage patterns and examples for gateproof.

**These are examples, not requirements.** gateproof is minimal by design - you can use it however fits your needs.

## Philosophy

gateproof has a minimal surface area. The effort should go into writing gates, not learning the library. These patterns show common use cases, but you're free to adapt them.

## Directory Structure

```
patterns/
├── basic/              # Basic usage patterns
├── prd/                # PRD-as-code + ralph loop
├── cloudflare/         # Cloudflare-specific patterns
├── ci-cd/              # CI/CD integration patterns
└── advanced/           # Advanced patterns
```

## Basic Patterns

### `basic/simple-gate.ts`
Minimal gate example showing the core pattern.

### `basic/http-validation.ts`
Validates HTTP endpoints without log observation. Useful for smoke tests.

## Cloudflare Patterns

### `cloudflare/analytics-backend.ts`
Using Cloudflare Analytics Engine (recommended for production).

### `cloudflare/workers-logs.ts`
Using Workers Logs API for real-time log access.

### `cloudflare/cli-stream.ts`
Using CLI stream for local development with `wrangler dev`.

## CI/CD Patterns

### `ci-cd/github-actions.ts`
Example GitHub Actions workflow showing how to run gates in CI.

## Advanced Patterns

### `advanced/custom-backend.ts`
Creating custom backends to plug in any observability system.

### `advanced/multiple-gates.ts`
Running multiple gates in sequence for comprehensive validation.

## Running Patterns

```bash
# Run a specific pattern
bun run patterns/basic/simple-gate.ts

# PRD-as-code example (runs story gates in order)
bun run patterns/prd/run-prd.ts

# Agent-in-the-loop loop (local)
bash patterns/prd/ralph-loop.sh

# Patterns are examples - modify them for your needs
```

## Creating Your Own Patterns

1. Start with a basic pattern
2. Adapt it to your observability backend
3. Define your gates
4. Run them

That's it. gateproof stays out of your way.
