# How to Run Gates in CI

Goal: enforce gates before merge or deploy.

## Steps

1. Validate PRD shape

```bash
bun run prd:validate
```

2. Run PRD in CI

```yaml
- name: Run PRD
  run: bun run prd.ts
```

3. Fail fast on the first failing gate
- `runPrd` stops on first failure by default

## Related

- Reference: `docs/reference/prd-runner.md`
