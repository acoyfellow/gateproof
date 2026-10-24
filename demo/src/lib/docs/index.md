# Documentation

Gateproof runs a proof loop for coding agents. You write the claim in `plan.ts`. Gateproof observes the system, runs actions, and checks assertions. The agent may change the code. The agent may not change the proof.

## Start here

- **Tutorial** — [Your First Gate](/docs/tutorials/first-gate). One file, one story, one pass.
- **How-to** — [Run in a Loop](/docs/how-to/run-in-a-loop). Hand the first failing story to a worker.
- **How-to** — [Gate a Lean Proof](/docs/how-to/gate-a-lean-proof). Let the Lean kernel judge a claim.
- **How-to** — [Use the filepath Worker Alpha](/docs/how-to/use-the-filepath-worker-alpha). Run one worker turn on filepath.
- **How-to** — [Add Deja Memory](/docs/how-to/add-deja-memory). Recall what earlier runs learned.
- **Reference** — [API Reference](/docs/reference/api). Every public function and type.
- **Explanation** — [proof-spec.v0](/docs/explanations/proof-spec). The schema shared with unsurf.
- **Explanation** — [Case Studies](/docs/explanations/case-studies). What Gateproof has proven on real systems.

## Version note

The `main` branch on [GitHub](https://github.com/acoyfellow/gateproof) is version 0.6.0. These docs describe `main`. The npm package is still 0.5.0. Version 0.5.0 does not have stories, `dependsOn`, or the proof-spec helpers. Until 0.6.0 is on npm, clone the repository.
