# Tutorial: Your First Gate (Local CLI Stream)

Goal: run a real gate locally using Cloudflare’s CLI stream backend.

This is a guided, end‑to‑end path with a single outcome: **a gate passes using local logs**.

## Prereqs

- Bun or Node.js
- Wrangler running your worker locally
- `CLOUDFLARE_ACCOUNT_ID` and a `WORKER_NAME`

## 1. Start your worker locally

Run your worker with `wrangler dev` so logs can be streamed locally.

## 2. Create the gate file

Create `gates/hello.gate.ts`:

```ts
#!/usr/bin/env bun
import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const workerName = process.env.WORKER_NAME || "my-worker";

const provider = CloudflareProvider({ accountId, apiToken: "" });

const gate = {
  name: "hello-gate",
  observe: provider.observe({
    backend: "cli-stream",
    workerName,
  }),
  act: [
    Act.browser({ url: "http://localhost:8787", headless: true }),
    Act.wait(2000),
  ],
  assert: [
    Assert.noErrors(),
    Assert.hasAction("request_received"),
  ],
  stop: { idleMs: 3000, maxMs: 15000 },
};

Gate.run(gate).then((result) => {
  if (result.status !== "success") process.exit(1);
  process.exit(0);
});
```

## 3. Run the gate

```bash
bun gates/hello.gate.ts
```

If the action log `request_received` is emitted, the gate should pass.

## 4. If it fails

- Ensure `wrangler dev` is running
- Confirm `WORKER_NAME` matches the running worker
- Check your worker emits the action/stage you assert

## Next steps

- Add a second assertion (e.g. a stage or custom evidence)
- Convert this gate into a PRD story: `docs/how-to/write-a-prd-story.md`
