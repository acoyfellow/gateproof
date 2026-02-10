# Explanation: How Gateproof Works

Gateproof’s core idea is simple:

- **PRD defines intent** (what should exist)
- **Gates verify reality** (does it work, with evidence)
- **Agents iterate** until gates pass

## Authority boundaries

- PRD owns intent and dependency order
- Gate implementations own observation
- Gateproof runtime enforces only

## Evidence-first verification

Gates observe logs/telemetry, perform actions, and assert evidence. This prevents “pass on silence” and makes failures actionable.

## Deeper architecture

- `docs/effect-and-schema.md` explains Effect and Schema design choices

## Agent prompt templates

> Contributed by @grok

When building agent integrations, use structured prompts that reference gate output directly:

### Fix-a-failing-gate prompt

```
You are fixing a failing gate in a gateproof PRD.

## Failed gate
Story: {{failedStory.id}}
Title: {{failedStory.title}}
Gate file: {{failedStory.gateFile}}
Allowed paths: {{scope.allowedPaths}}

## What failed
{{failureSummary}}

## Evidence observed
Actions seen: {{evidence.actionsSeen}}
Stages seen: {{evidence.stagesSeen}}
Error tags: {{evidence.errorTags}}

## Recent diff
{{recentDiff}}

## Instructions
1. Read the gate file to understand what evidence is expected.
2. Find the source code that should emit the missing evidence.
3. Make the minimal change to fix the failing assertion.
4. Stay within the allowed paths.
```

### Spec interview prompt

```
Let's interview each other about this feature.
Ask me the minimum set of questions needed to write PRD stories with gates.
Focus on: smallest user-visible behavior, observable evidence, hard constraints, scope limits.
Output: 3-7 stories in gateproof format with id, title, gateFile, dependsOn, scope.
```

## Roadmap

> Contributed by @grok

Features under consideration for future versions:

- **Multi-agent collaboration**: Multiple agents working on independent story tracks in parallel, coordinated by the PRD dependency graph
- **Distributed agent execution**: Running agent loops across multiple machines with shared PRD state
- **Auto-scaling loops**: Dynamic `maxIterations` based on failure patterns (increase for flaky gates, decrease for repeated identical failures)
- **Built-in fix prompts**: Pre-written prompt templates for common failure types (missing action, scope violation, timeout)
- **Metrics export**: Export gate results as OpenTelemetry spans or Prometheus metrics for monitoring dashboards
- **PRD sharding**: Split large PRDs into index + module PRDs for token-efficient agent consumption (design documented in `docs/effect-and-schema.md`)
