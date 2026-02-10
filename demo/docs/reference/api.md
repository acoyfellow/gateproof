# API Reference

## Gate.run(spec)

Run a gate. Returns a result with status, logs, and evidence.

- `spec.name` is optional metadata
- `spec.observe` defines how logs are collected
- `spec.act` triggers behavior
- `spec.assert` verifies evidence
- `spec.stop` defines `idleMs` and `maxMs`

## Actions

```ts
Act.exec("command")              // Run shell command
Act.browser({ url, headless? })  // Browser automation (playwright)
Act.wait(ms)                     // Sleep
Act.deploy({ worker })           // Deploy marker
```

## Assertions

```ts
Assert.noErrors()
Assert.hasAction("name")
Assert.hasStage("stage")
Assert.custom("name", (logs) => boolean)
```

## Result

```ts
{
  status: "success" | "failed" | "timeout",
  durationMs: number,
  logs: Log[],
  evidence: {
    requestIds: string[],
    stagesSeen: string[],
    actionsSeen: string[],
    errorTags: string[]
  },
  error?: Error
}
```
