# Spec interview template

## Interview questions

1. What is the smallest user-visible behavior that must exist?
2. What logs/evidence will prove it works?
3. What is explicitly out of scope?
4. What are the hard constraints (paths, size limits, dependencies)?
5. What is the first gate we can run to verify progress?

## Output: PRD stories

Produce 3-7 stories with:
- `id` in kebab-case
- `title` describing the behavior
- `gateFile` pointing to a gate that proves it
- optional `dependsOn` and `scope`

Example:
```
{
  id: "checkout-success",
  title: "User can complete checkout",
  gateFile: "./gates/checkout-success.gate.ts",
  dependsOn: ["cart-add-item"],
  scope: { allowedPaths: ["src/checkout/**"], maxChangedFiles: 5 }
}
```
