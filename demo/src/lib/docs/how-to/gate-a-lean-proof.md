# How To: Gate a Lean Proof

**Task:** make a story pass only when the Lean kernel accepts a theorem.

**Done when:** the honest proof passes, and every cheat fails.

## Why use Lean

An HTTP check proves that one request worked. A Lean theorem proves a property for every input that the claim covers. The agent can write the proof. The agent cannot make the kernel accept a wrong proof.

## The example

[`examples/hello-theorem/`](https://github.com/acoyfellow/gateproof/tree/main/examples/hello-theorem) has three Lean files:

| File | Content | Expected |
| --- | --- | --- |
| `Claim.lean` | `theorem denied_302 : denied 302 = true := by decide` | pass |
| `cheat-sorry.lean` | the same theorem, proved with `sorry` | fail |
| `cheat-axiom.lean` | the claim declared as an `axiom` | fail |

`check.sh` rejects `sorry` and `axiom`, checks that `theorem denied_302` is present, and then runs `lean`.

## Run it

You need `lean` on your `PATH`. Install it with [elan](https://github.com/leanprover/elan). The example uses only core Lean 4 (`decide`). It has no Mathlib dependency.

```bash
bun run example:hello-theorem
```

The plan has three stories: `honest-kernel`, `sorry-is-red`, and `axiom-is-red`. The two cheat stories have `dependsOn: ["honest-kernel"]`. A cheat story passes only when the check **rejects** the cheat:

```ts
Act.exec(`sh -c 'sh ${here}/check.sh ${here}/cheat-sorry.lean; test $? -ne 0'`)
```

## Limits

- `check.sh` uses `grep` to find `sorry` and `axiom`. A grep does not find every cheat. For a stronger check, run `#print axioms` on each theorem. Allow only `propext`, `Classical.choice`, and `Quot.sound`.
- Lean proves the Lean model. It does not prove that your TypeScript code matches the model.
