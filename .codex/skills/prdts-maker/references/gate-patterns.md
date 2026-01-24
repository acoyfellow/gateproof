# Gate Patterns

## Observation Backends

### HTTP Backend
Collect logs from an HTTP endpoint:

```typescript
observe: Observe.http({ url: "https://api.example.com/logs" })
```

### Cloudflare Backend
Collect logs from Cloudflare Workers:

```typescript
observe: Observe.cloudflare({ accountId: "...", scriptName: "my-worker" })
```

### Empty Observe
When you only need to run actions (no log collection):

```typescript
import { createEmptyObserveResource } from "gateproof";
observe: createEmptyObserveResource()
```

## Action Patterns

### Shell Execution
Run commands and verify output:

```typescript
act: [
  Act.exec("bun run build", { cwd: "./app", timeoutMs: 60000 }),
  Act.exec("bun test"),
]
```

### Browser Automation
Trigger UI flows with Playwright:

```typescript
act: [
  Act.browser({
    url: "https://app.example.com/signup",
    headless: true,
    waitMs: 2000,
  }),
]
```

### Sequencing
Wait between actions:

```typescript
act: [
  Act.exec("bun run migrate"),
  Act.wait(1000),  // let DB settle
  Act.exec("bun run seed"),
  Act.wait(500),
  Act.browser({ url: TEST_URL }),
]
```

### Deploy Marker
Signal deployment in logs:

```typescript
act: [
  Act.deploy({ worker: "my-worker" }),
]
```

## Assertion Patterns

### Built-in Assertions

```typescript
assert: [
  Assert.noErrors(),           // fails if any error log found
  Assert.hasAction("created"), // fails if action not in logs
  Assert.hasStage("complete"), // fails if stage not in logs
]
```

### Custom Assertions
For logic beyond simple presence checks:

```typescript
// Check specific data in logs
Assert.custom("user_has_email", (logs) => {
  const user = logs.find(l => l.action === "user_created");
  return user?.data?.email?.includes("@");
})

// Check count
Assert.custom("at_least_3_items", (logs) => {
  const items = logs.filter(l => l.action === "item_added");
  return items.length >= 3;
})

// Check sequence
Assert.custom("stages_in_order", (logs) => {
  const stages = logs.filter(l => l.stage).map(l => l.stage);
  const expected = ["init", "process", "complete"];
  return expected.every((s, i) => stages.indexOf(s) <= stages.indexOf(expected[i + 1] || s));
})
```

### Async Custom Assertions
When you need to verify external state:

```typescript
Assert.custom("file_exists_after_run", async () => {
  const exists = await Bun.file("./output.json").exists();
  return exists;
})
```

## Timeout Configuration

```typescript
stop: {
  idleMs: 2000,   // stop if no logs for 2s
  maxMs: 30000,   // hard timeout at 30s
}
```

- `idleMs`: How long to wait with no new logs before stopping
- `maxMs`: Maximum total time before timeout

## Complete Gate Examples

### Build Verification Gate

```typescript
export async function run() {
  return Gate.run({
    name: "build-passes",
    observe: createEmptyObserveResource(),
    act: [
      Act.exec("bun install", { cwd: "./app" }),
      Act.exec("bun run build", { cwd: "./app" }),
    ],
    assert: [
      Assert.custom("build_succeeds", async () => {
        const dist = await Bun.file("./app/dist/index.js").exists();
        return dist;
      }),
    ],
    stop: { idleMs: 1000, maxMs: 120000 },
  });
}
```

### API Endpoint Gate

```typescript
export async function run() {
  return Gate.run({
    name: "api-creates-user",
    observe: Observe.http({ url: API_LOG_URL }),
    act: [
      Act.exec(`curl -X POST ${API_URL}/users -d '{"email":"test@example.com"}'`),
      Act.wait(1000),
    ],
    assert: [
      Assert.hasAction("user_created"),
      Assert.hasStage("db_write"),
      Assert.noErrors(),
      Assert.custom("response_ok", (logs) => {
        return logs.some(l => l.data?.status === 201);
      }),
    ],
    stop: { idleMs: 2000, maxMs: 10000 },
  });
}
```

### E2E Flow Gate

```typescript
export async function run() {
  return Gate.run({
    name: "signup-to-dashboard",
    observe: Observe.http({ url: LOG_ENDPOINT }),
    act: [
      Act.browser({
        url: `${APP_URL}/signup`,
        script: async (page) => {
          await page.fill('[name="email"]', 'test@example.com');
          await page.fill('[name="password"]', 'secure123');
          await page.click('button[type="submit"]');
          await page.waitForURL('**/dashboard');
        },
      }),
    ],
    assert: [
      Assert.hasAction("user_signup"),
      Assert.hasAction("session_created"),
      Assert.hasStage("dashboard_loaded"),
      Assert.noErrors(),
    ],
    stop: { idleMs: 3000, maxMs: 30000 },
  });
}
```

## Gate Anti-Patterns

**Avoid:**
- `Assert.noErrors()` as the only assertion (silent success passes)
- Hardcoded timeouts that are too short (flaky gates)
- No wait between action and assertion (race conditions)
- Asserting implementation details instead of behavior

**Prefer:**
- At least one positive assertion (something happened)
- Generous timeouts with idle detection
- `Act.wait()` to let systems settle
- Assertions on observable behavior and outcomes
