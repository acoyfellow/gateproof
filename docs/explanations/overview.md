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
