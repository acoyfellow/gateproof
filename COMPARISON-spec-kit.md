# Gateproof vs. Spec-Kit: Comparison Matrix

## TL;DR

**Gateproof** and **Spec-Kit** both aim to improve AI-assisted software development through specifications, but they attack the problem from opposite ends:

- **Spec-Kit** is a **pre-implementation methodology toolkit** — it helps you *write better specs* before code is generated.
- **Gateproof** is a **post-implementation verification engine** — it helps you *prove running systems match specs* after code is generated.

They are complementary, not competitive.

---

## Identity

| Dimension | Gateproof | Spec-Kit |
|---|---|---|
| **Tagline** | "Plans are solid. Implementation is liquid." | "Spec-Driven Development for AI coding agents" |
| **Author** | Independent / gateproof.dev | GitHub (github/spec-kit) |
| **Language** | TypeScript (Effect.ts) | Python 3.11+ |
| **Runtime** | Bun / Node.js / Cloudflare Workers | UV package manager / CLI |
| **Package** | `gateproof` (npm) | `specify` (UV tool) |
| **License** | See repo | Open source |
| **Maturity** | Active development, 27 test files | Early release (v0.x) |

---

## Core Philosophy

| | Gateproof | Spec-Kit |
|---|---|---|
| **Central metaphor** | Gates — checkpoints that verify reality | Specifications — blueprints that guide intent |
| **When it runs** | During & after implementation | Before implementation |
| **What it produces** | Pass/fail verdicts + evidence | Markdown artifacts (constitutions, specs, plans, tasks) |
| **Feedback loop** | Automated: observe → act → assert → retry | Manual/AI-assisted: clarify → analyze → refine |
| **Verification model** | Runtime behavioral verification | Static artifact consistency checking |

---

## Feature Comparison Matrix

| Feature | Gateproof | Spec-Kit |
|---|---|---|
| **Spec definition** | PRDs with Stories (TypeScript) | Constitution → Spec → Plan → Tasks (Markdown) |
| **Executable specs** | Yes — gates run as code | No — specs are documents consumed by agents |
| **Runtime verification** | Yes — observes live systems | No — validation is pre-implementation |
| **AI agent orchestration** | Yes — spawns & governs agents in containers | No — provides prompts/commands for agents |
| **Agent governance** | Yes — authority policies (tool restrictions, spawn limits) | No — relies on spec clarity to constrain agents |
| **Retry loops** | Built-in (`runPrdLoop`) with context injection | Manual — re-run slash commands |
| **Multi-agent support** | Yes — `Act.agent()` spawns isolated agents | Yes — supports 20+ agents via slash commands |
| **Scope enforcement** | Git-aware (max files, forbidden paths, line limits) | No programmatic enforcement |
| **Browser testing** | Yes — Playwright via `Act.browser()` | No |
| **HTTP testing** | Yes — polling with circuit breaker | No |
| **Shell execution** | Yes — `Act.exec()` with injection prevention | No |
| **Deployment actions** | Yes — `Act.deploy()` for Cloudflare Workers | No |
| **Dependency ordering** | Topological sort of stories | Sequential phase ordering |
| **Parallel execution** | Yes — parallel story levels | No |
| **Structured reporting** | Versioned JSON schemas (GateResultV1, PrdReportV1) | Markdown checklists |
| **CI/CD integration** | GitHub Actions patterns, exit codes | No built-in CI integration |
| **Cloud-native runtime** | Cloudflare Workers, Durable Objects, Analytics Engine | None — local CLI only |
| **Programmatic API** | Yes — full TypeScript API | No — CLI + slash commands only |
| **Observability backends** | HTTP, Cloudflare Analytics, Workers Logs, Filepath, Test | None |

---

## Workflow Comparison

### Spec-Kit Workflow (Pre-Implementation)

```
  /speckit.constitution     Define project principles
         │
         ▼
  /speckit.specify          Write requirements & user stories
         │
         ▼
  /speckit.clarify          Resolve ambiguities
         │
         ▼
  /speckit.plan             Create technical strategy
         │
         ▼
  /speckit.analyze          Validate artifact consistency
         │
         ▼
  /speckit.tasks            Break plan into actionable items
         │
         ▼
  /speckit.implement        AI executes the plan
         │
         ▼
  /speckit.checklist        Generate quality checklist
```

### Gateproof Workflow (Post-Implementation)

```
  definePrd({ stories })    Define behavioral gates per story
         │
         ▼
  Gate.run({                Execute each gate:
    observe: backend,         1. Start observing (logs, HTTP, analytics)
    act: [actions],           2. Trigger behavior (deploy, browse, exec)
    assert: [checks]          3. Assert evidence matches spec
  })
         │
    ┌────┴────┐
    ▼         ▼
  PASS      FAIL ──→ runPrdLoop() ──→ Agent gets context
    │                     │              (failure summary,
    ▼                     │               git diff, PRD)
  Next Story              │
                          ▼
                    Agent fixes code
                          │
                          ▼
                    Re-run gates (loop)
```

---

## Conceptual Overlap

| Shared Concept | Spec-Kit Implementation | Gateproof Implementation |
|---|---|---|
| **Specifications** | Markdown documents (constitution, spec, plan) | TypeScript PRDs with Story objects |
| **Quality gates** | Sequential phase ordering (can't plan before specifying) | Executable assertions on live systems |
| **AI agent integration** | Slash commands consumed by 20+ agents | Direct orchestration — spawns agents in containers |
| **Iteration** | Re-run clarify/analyze commands manually | Automated retry loop with context injection |
| **Validation** | `/speckit.analyze` checks artifact consistency | `Assert.*` checks runtime behavior |
| **Task decomposition** | `/speckit.tasks` generates task lists | `definePrd({ stories })` with dependency DAGs |

---

## Strengths

### Spec-Kit Strengths
- **Low barrier to entry** — just install and run slash commands
- **Agent-agnostic** — works with 20+ AI coding agents out of the box
- **Methodology-first** — teaches a disciplined spec-driven workflow
- **No code required** — non-developers can write specs
- **Broad applicability** — works for any tech stack or language

### Gateproof Strengths
- **Executable verification** — specs aren't just documents, they're runnable tests
- **Automated feedback loops** — agents automatically retry on failure with context
- **Agent governance** — enforces tool/spawn/commit policies on AI agents
- **Cloud-native** — built for Cloudflare Workers, Durable Objects, Analytics Engine
- **Composable primitives** — Observe/Act/Assert pattern is simple yet powerful
- **Scope enforcement** — git-aware constraints prevent runaway changes
- **Effect.ts foundation** — type-safe, composable async with proper resource cleanup
- **Structured evidence** — machine-readable reports, not just pass/fail

---

## Weaknesses / Gaps

### Spec-Kit Gaps
- No runtime verification — can't prove code actually works
- No automated retry/iteration loop
- No programmatic API — CLI-only
- No governance enforcement on agents
- No cloud/CI integration built in
- Validation is artifact-level (consistency), not behavior-level

### Gateproof Gaps
- Steeper learning curve (TypeScript, Effect.ts, Zod)
- Cloudflare-centric for cloud features (less portable)
- No spec-writing assistance — assumes you already have a PRD
- No multi-agent-platform abstraction (agent spawning is container-based)
- Requires developer expertise to write gates

---

## Complementary Usage: Spec-Kit + Gateproof

The two tools naturally compose into a full lifecycle:

```
┌──────────────────────────────────────────────────────────────────┐
│                    SPEC-KIT (Phase 1: Define)                    │
│                                                                  │
│  Constitution → Specification → Plan → Tasks                     │
│  "What do we want? Is it clear? Is it consistent?"               │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼  Specs become Gateproof PRD stories
┌──────────────────────────────────────────────────────────────────┐
│                   GATEPROOF (Phase 2: Verify)                    │
│                                                                  │
│  PRD → Gates → Observe/Act/Assert → Agent Loop → Evidence        │
│  "Does the running system actually do what the spec says?"       │
└──────────────────────────────────────────────────────────────────┘
```

**Spec-Kit ensures you build the right thing.**
**Gateproof ensures you built it right.**

---

## Target Audience

| | Gateproof | Spec-Kit |
|---|---|---|
| **Primary** | Platform engineers, DevOps, AI agent builders | Product managers, developers, AI-assisted teams |
| **Skill level** | Intermediate-advanced TypeScript developers | Any — non-developers can use it |
| **Use case** | Continuous verification of deployed systems | Upfront specification for new projects |
| **Team size** | Solo to mid-size engineering teams | Any team using AI coding agents |

---

## Summary Table

| Dimension | Gateproof | Spec-Kit |
|---|---|---|
| **What** | Behavioral verification engine | Spec-writing methodology toolkit |
| **When** | Post-implementation (runtime) | Pre-implementation (design time) |
| **How** | Observe → Act → Assert (code) | Constitution → Spec → Plan → Tasks (docs) |
| **Verification** | Runtime evidence from live systems | Static artifact consistency |
| **Automation** | High — automated loops, CI/CD | Low — manual slash commands |
| **Agent model** | Orchestrates & governs agents | Provides prompts for agents |
| **Output** | Pass/fail + structured evidence JSON | Markdown specifications |
| **API** | Full programmatic TypeScript API | CLI + slash commands only |
| **Cloud** | Cloudflare-native | Local-only |
| **Complexity** | Higher (Effect.ts, TypeScript, Zod) | Lower (CLI, Markdown) |
| **Portability** | Bun/Node/Cloudflare | Any platform with Python 3.11+ |
