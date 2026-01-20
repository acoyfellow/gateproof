# gateproof - Agent Context

## Project Description

gateproof is an E2E testing harness library. It follows a minimal API with three core concepts: **Gate**, **Act**, **Assert**.

- **Gate**: Runs a test specification that observes logs, executes actions, and validates assertions
- **Act**: Actions to perform (browser automation, shell commands, waits, deploy markers)
- **Assert**: Validations to check (no errors, has action, has stage, custom assertions)

The library works with any observability backend by implementing a simple `Backend` interface. Cloudflare backends are provided out of the box (Analytics Engine, Workers Logs API, CLI Stream).

**Philosophy**: "Building software in reverse" - define gates first, then build to pass through them.

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Core Library**: Effect (functional programming)
- **Schema**: @effect/schema
- **Demo App**: SvelteKit 5 (deployed to Cloudflare Workers via Alchemy)
- **Testing**: Bun's built-in test runner

## Build, Run, Test

### Build
```bash
bun run build          # Build TypeScript to dist/
bun run typecheck      # Type check without building
```

### Test
```bash
bun test                                    # Run all tests
bun test --exclude test/demo.production.test.ts  # Exclude production tests (for CI)
bun test:demo                              # Run demo tests only
bun test:production                        # Run production tests only
```

### Gates
```bash
bun run gate:production    # Run production gates
bun run gate:local         # Run local gates
bun run gate:all           # Run all gates
```

### Demo App
```bash
cd demo
bun run dev                # Start dev server
bun run build              # Build for production
bun run deploy             # Deploy to Cloudflare (requires .env)
```

## Project Structure

```
gateproof/
├── src/                   # Core library code
│   ├── index.ts          # Main exports (Gate, Act, Assert)
│   ├── act.ts            # Action definitions
│   ├── assert.ts         # Assertion definitions
│   ├── observe.ts        # Observability backend interface
│   ├── provider.ts       # Provider interface
│   └── cloudflare/       # Cloudflare-specific backends
├── test/                  # Unit and integration tests
├── gates/                 # Gate definitions
│   ├── production/       # Production environment gates
│   └── local/            # Local development gates
├── patterns/              # Usage examples and patterns
│   ├── basic/            # Basic usage patterns
│   ├── cloudflare/       # Cloudflare-specific patterns
│   ├── ci-cd/            # CI/CD integration examples
│   └── advanced/         # Advanced patterns
├── demo/                  # SvelteKit demo application
│   └── src/              # SvelteKit app source
└── dist/                  # Built output (gitignored)
```

## Current Focus

- Maintain code quality and fix bugs
- Improve documentation and examples
- Keep the API minimal and focused
- Ensure all tests pass

## Agent-First Promise

gateproof is optimized for agent experience. The API is intentionally tiny so it can stay in an agent's context window.

**Promise: test against reality.** A gate executes real actions, listens to real observability data, and returns evidence that the system behaved as expected.

What agents want from the contract:
- **Small, stable vocabulary**: Gate / Act / Assert.
- **Deterministic IO**: actions are the only side effects; assertions are pure.
- **Evidence over prose**: logs + summarized evidence.
- **Clear failure modes**: timeout vs. assertion vs. observability error.
- **Composable checkpoints**: gates represent executable checkpoints in a plan.

## Constraints & Patterns

### Code Style
- **Minimal code**: Less is more - avoid verbose code
- **Pragmatic over clever**: Simple working code beats complex theoretical solutions
- **Don't fix what isn't broken**: Only change code when there's a measurable problem
- **Every line is a liability**: Delete dead code aggressively

### Svelte 5
- Use Svelte 5 (not Svelte 4)
- **Avoid `$effect` rune** at all costs
- Use `@lucide/svelte` for icons (not flowbite-svelte-icons)
- Use Tailwind CSS for styling
- Put frontend JavaScript in separate files, not inline in HTML

### Testing
- Tests must pass before committing
- Use `bun test` for running tests
- Production tests require external dependencies (exclude in CI)

### Git & Deployment
- Alchemy auto-generates `wrangler.jsonc` - do not manually edit it
- Use `.env` file for Cloudflare credentials (gitignored)

### Error Handling
- Never write "fallback code" for when something should throw or return an error
- This prevents actually fixing things

## Key Files

- `src/index.ts` - Main library exports
- `gates/production/smoke.gate.ts` - Production smoke gate example
- `demo/src/routes/+page.svelte` - Demo app homepage
- `patterns/basic/simple-gate.ts` - Basic usage example

## Notes

- The library is designed to work with any observability backend
- Cloudflare backends are provided but not required
- Playwright is optional (only needed for `Act.browser`)
- Effect library is used for functional programming patterns
