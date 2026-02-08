# gateproof

Build software in reverse. PRD defines intent. Gates verify reality. Agents iterate until gates pass.

Gateproof is a small runtime for executing **gates**: scripts that observe, act, and assert against real evidence (logs/telemetry). It does not decide intent or sequencing; your PRD (or CI) does.

## 90‑Second Proof

1. Run a local worker (e.g. `wrangler dev`)
2. Paste the gate below into `gates/hello.gate.ts`
3. Run: `bun gates/hello.gate.ts`

If your logs emit `request_received`, the gate passes.

```ts
#!/usr/bin/env bun
import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const workerName = process.env.WORKER_NAME || "my-worker";

const provider = CloudflareProvider({ accountId, apiToken: "" });

const gate = {
  name: "hello-gate",
  observe: provider.observe({ backend: "cli-stream", workerName }),
  act: [Act.browser({ url: "http://localhost:8787", headless: true }), Act.wait(2000)],
  assert: [Assert.noErrors(), Assert.hasAction("request_received")],
  stop: { idleMs: 3000, maxMs: 15000 },
};

Gate.run(gate).then((result) => {
  if (result.status !== "success") process.exit(1);
  process.exit(0);
});
```

## Start Here

- **Quick start (5 minutes):** `docs/tutorials/first-gate.md`
- **How-to guides:** `docs/how-to/`
- **API reference:** `docs/reference/`
- **Explanations (why/architecture):** `docs/explanations/`

If you’re new, start with the tutorial. If you’re trying to do a task, use the how‑to guides.

## CLI: generate a PRD

```bash
echo "Build a signup flow with email verification and login" | npx gateproof prdts --stdout
npx gateproof prdts --in stories.txt --out prd.ts
```

## Why gateproof

- **PRD is authority on intent**. Gateproof enforces reality, not plans.
- **Gates verify evidence**. Logs and telemetry are the contract.
- **Agent iterations are minimal‑context**. PRD + failure evidence is enough.

## Install

```bash
bun add gateproof
# or
npm i gateproof
```

## Docs Map (Diátaxis)

**Tutorials** (learn by doing)
- `docs/tutorials/first-gate.md`

**How‑to Guides** (solve a task)
- `docs/how-to/add-a-gate.md`
- `docs/how-to/write-a-prd-story.md`
- `docs/how-to/run-in-ci.md`
- `docs/how-to/add-observability-logging.md`

**Reference** (facts and API)
- `docs/reference/api.md`
- `docs/reference/prd-runner.md`

**Explanation** (concepts and architecture)
- `docs/explanations/overview.md`
- `docs/effect-and-schema.md`

## License

MIT
