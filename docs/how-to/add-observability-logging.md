# How to Add Observability Logging

Goal: emit evidence that gates can assert reliably.

## What gates need

Gates assert **positive evidence** (actions/stages) and **absence of errors**. If your system is silent, gates can’t prove success.

## Practical guidance

- Emit a **named action** when a critical transition completes
- Emit a **stage** when entering or exiting important phases
- Tag errors with stable identifiers

## Example (conceptual)

When a user signs up, emit evidence that a gate can assert:

- action: `user_created`
- stage: `signup_complete`
- error tag (if any): `db_error`

## Tip

Pick evidence you can observe consistently in prod and local dev. Your confidence is bounded by your telemetry.
