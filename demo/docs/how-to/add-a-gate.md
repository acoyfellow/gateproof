# How to Add a Gate

Goal: add a new gate that proves a real system behavior with evidence.

## Steps

1. Decide the evidence you can observe
- Example: an action tag like `user_created` or a stage like `checkout_complete`

2. Pick an observability backend
- Cloudflare Analytics Engine
- Cloudflare Workers Logs API
- CLI stream (local dev)

3. Create a new gate file

```ts
import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

const provider = CloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken: process.env.CLOUDFLARE_API_TOKEN!,
});

export async function run() {
  return Gate.run({
    name: "user-signup",
    observe: provider.observe({ backend: "analytics", dataset: "worker_logs" }),
    act: [Act.browser({ url: "https://app.example.com/signup" })],
    assert: [
      Assert.hasAction("user_created"),
      Assert.noErrors(),
    ],
  });
}
```

4. Prefer positive evidence
- Avoid `Assert.noErrors()` alone
- Always assert a real signal

## Related

- Tutorial: `docs/tutorials/first-gate.md`
- Reference: `docs/reference/api.md`
