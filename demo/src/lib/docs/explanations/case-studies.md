# Case Studies

Each case study states the claim, the method, and the public artifacts that prove it.

## 1. Cinder

Cinder is a CI runner built on Cloudflare. One `plan.ts` proves it, in three chapters:

1. The original build is preserved.
2. Gateproof's deploy workflow ran through Cinder.
3. Proof runs are part of Cinder's product path.

Cloudflare hosts the control plane. A separate machine still runs the compute. Hosted compute is not proven yet.

- [Cinder case study](/case-studies/cinder) — inputs, outputs, and artifacts.
- [alchemy.run.ts](https://github.com/acoyfellow/cinder-round-one-end/blob/main/alchemy.run.ts) — provisioning.
- [plan.ts](https://github.com/acoyfellow/cinder-round-one-end/blob/main/plan.ts) — proof contract.
