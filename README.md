# Gateproof

Gateproof runs the proof, sends in the worker, and keeps going until the live claim is true.

## Tutorial

Goal: Start with one tiny gate that is small on purpose and complete on purpose.

### examples/hello-world/plan.ts

```ts
import { Effect } from "effect";
import {
  Act,
  Assert,
  Gate,
  Plan,
  createHttpObserveResource,
  type ScopeFile,
} from "../../src/index";
import { HELLO_WORLD_PORT } from "./server";

const baseUrl = `http://127.0.0.1:${HELLO_WORLD_PORT}`;

const scope = {
  spec: {
    title: "Hello World",
    tutorial: {
      goal: "Prove one tiny thing.",
      outcome: "The run only passes when the live response says hello world.",
    },
    howTo: {
      task: "Run one complete gate from one file.",
      done: "The endpoint returns 200 and the body contains hello world.",
    },
    explanation: {
      summary: "Even the smallest run is still a real proof loop.",
    },
  },
  plan: Plan.define({
    goals: [
      {
        id: "hello-world",
        title: "GET / returns hello world",
        gate: Gate.define({
          observe: createHttpObserveResource({
            url: `${baseUrl}/`,
          }),
          act: [Act.exec(`curl -sf ${baseUrl}/`)],
          assert: [
            Assert.httpResponse({ status: 200 }),
            Assert.responseBodyIncludes("hello world"),
            Assert.noErrors(),
          ],
        }),
      },
    ],
    loop: {
      maxIterations: 1,
      stopOnFailure: true,
    },
  }),
} satisfies ScopeFile;

export default scope;

if (import.meta.main) {
  const result = await Effect.runPromise(Plan.runLoop(scope.plan));
  console.log(JSON.stringify(result, null, 2));

  if (result.status !== "pass") {
    process.exitCode = 1;
  }
}
```

Outcome: The loop only passes when the live response says hello world.

## First Case Study: Cinder

### alchemy.run.ts

```ts
import alchemy from "alchemy";
import { Buffer } from "node:buffer";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DurableObjectNamespace,
  KVNamespace,
  R2Bucket,
  Worker,
} from "alchemy/cloudflare";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for cinder provisioning`);
  }

  return value;
}

const githubPat = requireEnv("GITHUB_PAT");
const webhookSecret = requireEnv("GITHUB_WEBHOOK_SECRET");
const internalToken = requireEnv("CINDER_INTERNAL_TOKEN");
const fixtureRepo = process.env.CINDER_FIXTURE_REPO?.trim() || "acoyfellow/cinder-prd-test";
const fixtureBranch = process.env.CINDER_FIXTURE_BRANCH?.trim() || "main";
const fixtureWorkflow =
  process.env.CINDER_FIXTURE_WORKFLOW?.trim() || "cinder-proof.yml";
const githubApiBase = "https://api.github.com";

const fixtureCargoToml = `[package]
name = "cinder-proof"
version = "0.1.0"
edition = "2021"

[dependencies]
anyhow = "1"
chrono = { version = "0.4", features = ["serde"] }
clap = { version = "4.5", features = ["derive"] }
datafusion = "=43.0.0"
flate2 = "1"
rand = "0.9"
regex = "1"
reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
serde_yaml = "0.9"
sha2 = "0.10"
tokio = { version = "1", features = ["full"] }
toml = "0.8"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "fmt"] }
url = "2"
uuid = { version = "1", features = ["serde", "v4"] }
`;

const fixtureRecordCount = 5000;
const fixtureGeneratedRecords = Array.from({ length: fixtureRecordCount }, (_, index) => {
  const seed = (index % 97) + 1;

  return `#[derive(Serialize, Deserialize)]
struct ProofRecord${index} {
    id: u64,
    label: &'static str,
    values: [u32; 8],
}

fn proof_record_${index}() -> u64 {
    let record = ProofRecord${index} {
        id: ${index}u64,
        label: "cinder-proof",
        values: [${seed}, ${seed + 1}, ${seed + 2}, ${seed + 3}, ${seed + 4}, ${seed + 5}, ${seed + 6}, ${seed + 7}],
    };

    record.id + record.values.iter().map(|value| *value as u64).sum::<u64>()
}`;
}).join("\n\n");
const fixtureGeneratedChecksum = Array.from(
  { length: fixtureRecordCount },
  (_, index) => `proof_record_${index}()`,
).join(" + ");

const fixtureMainRs = `use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct ProofMessage {
    ok: bool,
    source: &'static str,
    checksum: u64,
}

${fixtureGeneratedRecords}

fn main() {
    let checksum: u64 = ${fixtureGeneratedChecksum};
    let message = ProofMessage {
        ok: true,
        source: "cinder-proof",
        checksum,
    };

    println!("{}", serde_json::to_string(&message).unwrap());
}
`;

const fixtureWorkflowContents = `name: cinder-proof
on:
  workflow_dispatch:
jobs:
  cargo-build:
    runs-on: [self-hosted, cinder]
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - name: Build fixture
        run: cargo build --locked --release
      - name: Run fixture
        run: cargo run --locked --release
`;

async function generateFixtureCargoLock() {
  const fixtureDir = await mkdtemp(join(tmpdir(), "cinder-proof-fixture-"));

  try {
    await mkdir(join(fixtureDir, "src"), { recursive: true });
    await writeFile(join(fixtureDir, "Cargo.toml"), fixtureCargoToml, "utf8");
    await writeFile(join(fixtureDir, "src", "main.rs"), fixtureMainRs, "utf8");

    const proc = Bun.spawn(["cargo", "generate-lockfile"], {
      cwd: fixtureDir,
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    const stderr = await new Response(proc.stderr).text();

    if (exitCode !== 0) {
      throw new Error(
        `Failed to generate fixture Cargo.lock: ${stderr || `cargo exited with ${exitCode}`}`,
      );
    }

    return await readFile(join(fixtureDir, "Cargo.lock"), "utf8");
  } finally {
    await rm(fixtureDir, { recursive: true, force: true });
  }
}

function parseFixtureRepository(repoRef: string) {
  const [owner, name, ...extra] = repoRef.split("/");

  if (!owner || !name || extra.length > 0) {
    throw new Error(
      `CINDER_FIXTURE_REPO must be "owner/name" but received "${repoRef}"`,
    );
  }

  return { owner, name };
}

async function githubRequest(
  path: string,
  init: RequestInit = {},
  okStatuses: number[] = [200],
) {
  const response = await fetch(`${githubApiBase}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubPat}`,
      "User-Agent": "cinder-provisioner",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });

  if (okStatuses.includes(response.status)) {
    return response;
  }

  const body = await response.text();
  throw new Error(
    `GitHub API ${init.method ?? "GET"} ${path} failed with ${response.status}: ${body}`,
  );
}

async function ensureFixtureRepository() {
  const { owner, name } = parseFixtureRepository(fixtureRepo);
  const existing = await githubRequest(`/repos/${owner}/${name}`, {}, [200, 404]);

  if (existing.status === 200) {
    return (await existing.json()) as { default_branch: string; full_name: string };
  }

  const viewer = (await (
    await githubRequest("/user")
  ).json()) as { login: string };

  if (viewer.login !== owner) {
    throw new Error(
      `Fixture repo ${fixtureRepo} is missing and cannot be auto-created because PAT owner "${viewer.login}" does not match "${owner}"`,
    );
  }

  const created = await githubRequest(
    "/user/repos",
    {
      method: "POST",
      body: JSON.stringify({
        name,
        description: "Canonical GitHub proof fixture for Cinder",
        auto_init: true,
        private: false,
      }),
    },
    [201],
  );

  return (await created.json()) as { default_branch: string; full_name: string };
}

async function ensureFixtureBranch(repo: { default_branch: string }) {
  if (fixtureBranch === repo.default_branch) {
    return;
  }

  const { owner, name } = parseFixtureRepository(fixtureRepo);
  const branchResponse = await githubRequest(
    `/repos/${owner}/${name}/git/ref/heads/${encodeURIComponent(fixtureBranch)}`,
    {},
    [200, 404],
  );

  if (branchResponse.status === 200) {
    return;
  }

  const defaultBranchRef = (await (
    await githubRequest(
      `/repos/${owner}/${name}/git/ref/heads/${encodeURIComponent(repo.default_branch)}`,
    )
  ).json()) as { object: { sha: string } };

  await githubRequest(
    `/repos/${owner}/${name}/git/refs`,
    {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${fixtureBranch}`,
        sha: defaultBranchRef.object.sha,
      }),
    },
    [201],
  );
}

async function upsertFixtureFile(path: string, content: string, message: string) {
  const { owner, name } = parseFixtureRepository(fixtureRepo);
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const existing = await githubRequest(
    `/repos/${owner}/${name}/contents/${encodedPath}?ref=${encodeURIComponent(fixtureBranch)}`,
    {},
    [200, 404],
  );
  const sha =
    existing.status === 200
      ? ((await existing.json()) as { sha: string }).sha
      : undefined;

  await githubRequest(
    `/repos/${owner}/${name}/contents/${encodedPath}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message,
        branch: fixtureBranch,
        content: Buffer.from(content, "utf8").toString("base64"),
        sha,
      }),
    },
    [200, 201],
  );
}

async function upsertFixtureWebhook(webhookUrl: string) {
  const { owner, name } = parseFixtureRepository(fixtureRepo);
  const hooks = (await (
    await githubRequest(`/repos/${owner}/${name}/hooks`)
  ).json()) as Array<{ id: number; name: string; config?: { url?: string } }>;
  const existing = hooks.find(
    (hook) => hook.name === "web" && hook.config?.url === webhookUrl,
  );
  const body = JSON.stringify({
    active: true,
    events: ["workflow_job"],
    config: {
      url: webhookUrl,
      content_type: "json",
      insecure_ssl: "0",
      secret: webhookSecret,
    },
  });

  if (existing) {
    await githubRequest(
      `/repos/${owner}/${name}/hooks/${existing.id}`,
      {
        method: "PATCH",
        body,
      },
      [200],
    );
    return;
  }

  await githubRequest(
    `/repos/${owner}/${name}/hooks`,
    {
      method: "POST",
      body,
    },
    [201],
  );
}

async function syncFixtureRepository(webhookUrl: string) {
  const repo = await ensureFixtureRepository();
  await ensureFixtureBranch(repo);
  const fixtureCargoLock = await generateFixtureCargoLock();

  await upsertFixtureFile("Cargo.toml", fixtureCargoToml, "chore: sync cinder fixture Cargo.toml");
  await upsertFixtureFile("Cargo.lock", fixtureCargoLock, "chore: sync cinder fixture Cargo.lock");
  await upsertFixtureFile("src/main.rs", fixtureMainRs, "chore: sync cinder fixture main.rs");
  await upsertFixtureFile(
    `.github/workflows/${fixtureWorkflow}`,
    fixtureWorkflowContents,
    "chore: sync cinder fixture workflow",
  );
  await upsertFixtureWebhook(webhookUrl);
}

export const app = await alchemy("cinder", {
  stage: process.env.CINDER_STAGE ?? "production",
});

export const cacheBucket = await R2Bucket("cinder-cache", {
  empty: false,
});

export const runnerState = await KVNamespace("cinder-runner-state");

export const runnerPool = await DurableObjectNamespace("RunnerPool", {
  className: "RunnerPool",
  sqlite: true,
});

export const jobQueue = await DurableObjectNamespace("JobQueue", {
  className: "JobQueue",
  sqlite: true,
});

export const cacheWorker = await Worker("cinder-cache-worker", {
  entrypoint: "./crates/cinder-cache/build/worker/shim.mjs",
  bindings: {
    CACHE_BUCKET: cacheBucket,
    CINDER_INTERNAL_TOKEN: alchemy.secret(internalToken),
  },
});

export const orchestrator = await Worker("cinder-orchestrator", {
  entrypoint: "./crates/cinder-orchestrator/build/worker/shim.mjs",
  bindings: {
    CACHE_BUCKET: cacheBucket,
    RUNNER_STATE: runnerState,
    RUNNER_POOL: runnerPool,
    JOB_QUEUE: jobQueue,
    GITHUB_WEBHOOK_SECRET: alchemy.secret(webhookSecret),
    CINDER_INTERNAL_TOKEN: alchemy.secret(internalToken),
    GITHUB_PAT: alchemy.secret(githubPat),
    CINDER_CACHE_WORKER_URL: cacheWorker.url,
    CINDER_FIXTURE_REPO: fixtureRepo,
    CINDER_FIXTURE_BRANCH: fixtureBranch,
    CINDER_FIXTURE_WORKFLOW: fixtureWorkflow,
  },
});

await app.finalize();
await syncFixtureRepository(`${orchestrator.url}/webhook/github`);

const runtimeDirectory = new URL("./.gateproof/", import.meta.url);
const runtimeFile = new URL("./.gateproof/runtime.json", import.meta.url);

await mkdir(runtimeDirectory, { recursive: true });

await Bun.write(
  runtimeFile,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      stage: process.env.CINDER_STAGE ?? "production",
      orchestratorName: orchestrator.name,
      orchestratorUrl: orchestrator.url,
      cacheWorkerName: cacheWorker.name,
      cacheWorkerUrl: cacheWorker.url,
      fixtureRepo,
      fixtureBranch,
      fixtureWorkflow,
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote runtime outputs to ${runtimeFile.pathname}`);
```

### plan.ts

```ts
import { Effect } from "effect";
import crypto from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import type { ScopeFile } from "gateproof";
import {
  Act,
  Assert,
  Gate,
  Plan,
  Require,
} from "gateproof";
import { Cloudflare } from "gateproof/cloudflare";

type RuntimeState = {
  orchestratorName?: string;
  orchestratorUrl?: string;
  cacheWorkerUrl?: string;
  fixtureRepo?: string;
  fixtureBranch?: string;
  fixtureWorkflow?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function loadRuntimeState(): RuntimeState | null {
  const runtimeFile = new URL("./.gateproof/runtime.json", import.meta.url);

  if (!existsSync(runtimeFile)) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(readFileSync(runtimeFile, "utf8"));
    if (!isRecord(parsed)) {
      return null;
    }

    return {
      orchestratorName:
        typeof parsed.orchestratorName === "string" ? parsed.orchestratorName : undefined,
      orchestratorUrl:
        typeof parsed.orchestratorUrl === "string" ? parsed.orchestratorUrl : undefined,
      cacheWorkerUrl:
        typeof parsed.cacheWorkerUrl === "string" ? parsed.cacheWorkerUrl : undefined,
      fixtureRepo: typeof parsed.fixtureRepo === "string" ? parsed.fixtureRepo : undefined,
      fixtureBranch:
        typeof parsed.fixtureBranch === "string" ? parsed.fixtureBranch : undefined,
      fixtureWorkflow:
        typeof parsed.fixtureWorkflow === "string" ? parsed.fixtureWorkflow : undefined,
    };
  } catch {
    return null;
  }
}

function resolveLocalRunnerId(): string {
  try {
    const hostname = readFileSync("/etc/hostname", "utf8").trim();
    return `cinder-${hostname || "unknown"}`;
  } catch {
    return "cinder-unknown";
  }
}

const runtimeState = loadRuntimeState();
const baseUrl = readOptionalEnv("CINDER_BASE_URL") ?? runtimeState?.orchestratorUrl ?? "";
const cacheWorkerUrl =
  readOptionalEnv("CINDER_CACHE_WORKER_URL") ?? runtimeState?.cacheWorkerUrl ?? "";
const workerName =
  readOptionalEnv("CINDER_WORKER_NAME") ?? runtimeState?.orchestratorName ?? "cinder-orchestrator";
const fixtureRepo =
  readOptionalEnv("CINDER_FIXTURE_REPO") ?? runtimeState?.fixtureRepo ?? "acoyfellow/cinder-prd-test";
const fixtureBranch = readOptionalEnv("CINDER_FIXTURE_BRANCH") ?? runtimeState?.fixtureBranch ?? "";
const fixtureWorkflow =
  readOptionalEnv("CINDER_FIXTURE_WORKFLOW") ?? runtimeState?.fixtureWorkflow ?? "";
const internalToken = readOptionalEnv("CINDER_INTERNAL_TOKEN") ?? "";

const missKey = crypto.randomBytes(32).toString("hex");
const newKey = crypto.randomBytes(32).toString("hex");
const speedThresholdMs = Number(process.env.SPEED_THRESHOLD_MS ?? "60000");
const testRepo = process.env.TEST_REPO ?? "";
const harnessBaseUrl = "http://127.0.0.1:9000";
const harnessRunUrl = `${harnessBaseUrl}/test/run`;
const localRunnerId = resolveLocalRunnerId();
const agentLogPath = "/tmp/cinder-agent-proof.log";
const agentPidPath = "/tmp/cinder-agent-proof.pid";
const runnerJobPath = "/tmp/cinder-proof-runner-job.json";
const queuePayloadPath = "/tmp/cinder-proof-queue-payload.json";
const cacheArchivePath = "/tmp/cinder-proof-cache-archive.tar.xz";
const proofArtifactPaths = [
  agentLogPath,
  agentPidPath,
  runnerJobPath,
  queuePayloadPath,
  cacheArchivePath,
];

let managedHarness: ReturnType<typeof Bun.spawn> | null = null;

async function canReachLocalHarness(): Promise<boolean> {
  try {
    const response = await fetch(harnessBaseUrl);
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

async function ensureLocalHarness(): Promise<void> {
  if (await canReachLocalHarness()) {
    return;
  }

  managedHarness = Bun.spawn({
    cmd: ["bun", "harness.ts"],
    cwd: process.cwd(),
    stdout: "inherit",
    stderr: "inherit",
  });

  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (await canReachLocalHarness()) {
      return;
    }

    await Bun.sleep(100);
  }

  throw new Error("cinder proof harness did not start on 127.0.0.1:9000");
}

function stopManagedHarness(): void {
  if (!managedHarness) {
    return;
  }

  managedHarness.kill();
  managedHarness = null;
}

function stopManagedAgent(): void {
  if (!existsSync(agentPidPath)) {
    return;
  }

  try {
    const pid = Number.parseInt(readFileSync(agentPidPath, "utf8").trim(), 10);
    if (Number.isFinite(pid)) {
      process.kill(pid);
    }
  } catch {
    // Ignore stale proof agent state.
  }

  try {
    rmSync(agentPidPath, { force: true });
  } catch {
    // Ignore pidfile cleanup failures during shutdown.
  }
}

function resetProofArtifacts(): void {
  for (const path of proofArtifactPaths) {
    try {
      rmSync(path, { force: true });
    } catch {
      // Ignore stale proof artifact cleanup failures during startup.
    }
  }
}

async function ensureColdBuildBaseline(): Promise<void> {
  if (readOptionalEnv("COLD_BUILD_MS")) {
    return;
  }

  if (!testRepo) {
    return;
  }

  try {
    const response = await fetch(harnessRunUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repo: testRepo,
        with_cache: false,
      }),
    });

    if (!response.ok) {
      return;
    }

    const parsed: unknown = await response.json();
    if (!isRecord(parsed)) {
      return;
    }

    const buildDurationMs = parsed.build_duration_ms;
    if (typeof buildDurationMs !== "number" || !Number.isFinite(buildDurationMs)) {
      return;
    }

    process.env.COLD_BUILD_MS = String(buildDurationMs);
  } catch {
    // Let the existing prerequisite fail clearly if the harness is unavailable.
  }
}

await ensureColdBuildBaseline();

const workerLogs = Cloudflare.observe({
  accountId: readOptionalEnv("CLOUDFLARE_ACCOUNT_ID") ?? "",
  apiToken: readOptionalEnv("CLOUDFLARE_API_TOKEN") ?? "",
  workerName,
  sinceMs: 120_000,
  pollInterval: 1_000,
});

const cacheWorkerLogName = (() => {
  if (!cacheWorkerUrl) {
    return "";
  }

  try {
    return new URL(cacheWorkerUrl).hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
})();

const cacheWorkerLogs = Cloudflare.observe({
  accountId: readOptionalEnv("CLOUDFLARE_ACCOUNT_ID") ?? "",
  apiToken: readOptionalEnv("CLOUDFLARE_API_TOKEN") ?? "",
  workerName: cacheWorkerLogName,
  sinceMs: 120_000,
  pollInterval: 1_000,
});

if (!process.env.CINDER_BASE_URL && baseUrl) {
  process.env.CINDER_BASE_URL = baseUrl;
}

if (!process.env.CINDER_WORKER_NAME && workerName) {
  process.env.CINDER_WORKER_NAME = workerName;
}

if (!process.env.CINDER_CACHE_WORKER_URL && cacheWorkerUrl) {
  process.env.CINDER_CACHE_WORKER_URL = cacheWorkerUrl;
}

if (!process.env.CINDER_FIXTURE_REPO && fixtureRepo) {
  process.env.CINDER_FIXTURE_REPO = fixtureRepo;
}

if (!process.env.CINDER_FIXTURE_BRANCH && fixtureBranch) {
  process.env.CINDER_FIXTURE_BRANCH = fixtureBranch;
}

if (!process.env.CINDER_FIXTURE_WORKFLOW && fixtureWorkflow) {
  process.env.CINDER_FIXTURE_WORKFLOW = fixtureWorkflow;
}

if (!process.env.SPEED_THRESHOLD_MS) {
  process.env.SPEED_THRESHOLD_MS = String(speedThresholdMs);
}

const scope = {
  spec: {
    title: "Cinder",
    tutorial: {
      goal: "Prove cinder on a live deployment, not just deploy it.",
      outcome:
        "Webhook intake, queueing, runner registration, cache paths, and the speed claim all go green.",
    },
    howTo: {
      task: "Run the cinder proof loop against already-provisioned infrastructure.",
      done:
        "Cinder only exits green when the live system can do the work and the speed claim holds.",
    },
    explanation: {
      summary:
        "alchemy.run.ts creates the infrastructure once and writes .gateproof/runtime.json. This file is only the acceptance loop for the live product.",
    },
  },
  plan: Plan.define({
    goals: [
      {
        id: "webhook",
        title: "A GitHub webhook queues a runnable job",
        gate: Gate.define({
          prerequisites: [
            Require.env(
              "CLOUDFLARE_ACCOUNT_ID",
              "CLOUDFLARE_ACCOUNT_ID is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CLOUDFLARE_API_TOKEN",
              "CLOUDFLARE_API_TOKEN is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "GITHUB_PAT",
              "GITHUB_PAT is required to dispatch the GitHub proof workflow.",
            ),
            Require.env(
              "CINDER_FIXTURE_BRANCH",
              "Run bun run provision first or set CINDER_FIXTURE_BRANCH for the GitHub proof fixture.",
            ),
            Require.env(
              "CINDER_FIXTURE_WORKFLOW",
              "Run bun run provision first or set CINDER_FIXTURE_WORKFLOW for the GitHub proof fixture.",
            ),
            Require.env(
              "CINDER_INTERNAL_TOKEN",
              "CINDER_INTERNAL_TOKEN is required for internal API access.",
            ),
            Require.env(
              "CINDER_BASE_URL",
              "Run bun run provision first or set CINDER_BASE_URL to the live orchestrator URL.",
            ),
          ],
          act: [
            Act.exec(
              `bun -e 'const repo = ${JSON.stringify(fixtureRepo)};
const workflow = ${JSON.stringify(fixtureWorkflow)};
const branch = ${JSON.stringify(fixtureBranch)};
const token = process.env.GITHUB_PAT;
if (!token) {
  throw new Error("GITHUB_PAT is required");
}
const headers = {
  Accept: "application/vnd.github+json",
  Authorization: "Bearer " + token,
  "X-GitHub-Api-Version": "2022-11-28",
};
const listUrl =
  "https://api.github.com/repos/" +
  repo +
  "/actions/workflows/" +
  workflow +
  "/runs?event=workflow_dispatch&branch=" +
  encodeURIComponent(branch) +
  "&per_page=20";
const response = await fetch(listUrl, { headers });
if (!response.ok) {
  throw new Error("GitHub workflow run listing failed: " + response.status);
}
const payload = await response.json();
const runs = Array.isArray(payload.workflow_runs) ? payload.workflow_runs : [];
for (const run of runs) {
  if (typeof run?.id !== "number" || run.status === "completed") {
    continue;
  }
  const cancelResponse = await fetch(
    "https://api.github.com/repos/" + repo + "/actions/runs/" + run.id + "/cancel",
    {
      method: "POST",
      headers,
    },
  );
  if (!cancelResponse.ok && cancelResponse.status !== 409) {
    throw new Error("GitHub workflow cancel failed: " + cancelResponse.status);
  }
}'`,
              {
                timeoutMs: 60_000,
              },
            ),
            Act.exec(
              `curl -sf -X POST https://api.github.com/repos/${fixtureRepo}/actions/workflows/${fixtureWorkflow}/dispatches \
                -H "Accept: application/vnd.github+json" \
                -H "Authorization: Bearer $GITHUB_PAT" \
                -H "X-GitHub-Api-Version: 2022-11-28" \
                -d '${JSON.stringify({ ref: fixtureBranch })}'`,
            ),
            Act.exec("sleep 12"),
            Act.exec(
              `bun -e 'const deadline = Date.now() + 30000;
while (Date.now() < deadline) {
  const response = await fetch(${JSON.stringify(`${baseUrl}/jobs/peek`)}, {
    headers: {
      Authorization: "Bearer " + ${JSON.stringify(internalToken)},
    },
  });
  if (!response.ok) {
    throw new Error("webhook queue inspection failed: " + response.status);
  }
  const payload = await response.json();
  if (typeof payload?.job_id === "number" && typeof payload?.run_id === "number") {
    console.log(JSON.stringify(payload));
    process.exit(0);
  }
  await Bun.sleep(500);
}
throw new Error("webhook did not queue a runnable job");'`,
            ),
          ],
          assert: [
            Assert.noErrors(),
            Assert.responseBodyIncludes("job_id"),
            Assert.responseBodyIncludes("run_id"),
          ],
          timeoutMs: 30_000,
        }),
      },
      {
        id: "queue",
        title: "A queued job can be inspected without dequeueing",
        gate: Gate.define({
          observe: workerLogs,
          prerequisites: [
            Require.env(
              "CLOUDFLARE_ACCOUNT_ID",
              "CLOUDFLARE_ACCOUNT_ID is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CLOUDFLARE_API_TOKEN",
              "CLOUDFLARE_API_TOKEN is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CINDER_INTERNAL_TOKEN",
              "CINDER_INTERNAL_TOKEN is required for queue inspection.",
            ),
            Require.env(
              "CINDER_BASE_URL",
              "Run bun run provision first or set CINDER_BASE_URL to the live orchestrator URL.",
            ),
          ],
          act: [
            Act.exec(
              `bun -e 'const deadline = Date.now() + 30000;
while (Date.now() < deadline) {
  const response = await fetch(${JSON.stringify(`${baseUrl}/jobs/peek`)}, {
    headers: {
      Authorization: "Bearer " + ${JSON.stringify(internalToken)},
    },
  });
  if (!response.ok) {
    throw new Error("queue inspection failed: " + response.status);
  }
  const payload = await response.json();
  if (
    typeof payload?.job_id === "number" &&
    typeof payload?.run_id === "number" &&
    typeof payload?.repo_full_name === "string" &&
    payload.repo_full_name.length > 0 &&
    typeof payload?.cache_key === "string" &&
    payload.cache_key.length > 0
  ) {
    const serialized = JSON.stringify(payload);
    await Bun.write(${JSON.stringify(queuePayloadPath)}, serialized);
    console.log(serialized);
    process.exit(0);
  }
  await Bun.sleep(500);
}
throw new Error("queue payload missing runnable job");'`,
            ),
          ],
          assert: [
            Assert.noErrors(),
            Assert.responseBodyIncludes("repo_full_name"),
            Assert.responseBodyIncludes("repo_clone_url"),
            Assert.responseBodyIncludes("runner_registration_url"),
            Assert.responseBodyIncludes("runner_registration_token"),
            Assert.responseBodyIncludes("cache_key"),
          ],
          timeoutMs: 8_000,
        }),
      },
      {
        id: "cache-restore",
        title: "The fixture cache key currently restores as a cold miss",
        gate: Gate.define({
          observe: workerLogs,
          prerequisites: [
            Require.env(
              "CLOUDFLARE_ACCOUNT_ID",
              "CLOUDFLARE_ACCOUNT_ID is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CLOUDFLARE_API_TOKEN",
              "CLOUDFLARE_API_TOKEN is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CINDER_INTERNAL_TOKEN",
              "CINDER_INTERNAL_TOKEN is required for cache restore.",
            ),
            Require.env(
              "CINDER_BASE_URL",
              "Run bun run provision first or set CINDER_BASE_URL to the live orchestrator URL.",
            ),
          ],
          act: [
            Act.exec(
              `bun -e 'import crypto from "node:crypto";
import { readFileSync } from "node:fs";
const payload = JSON.parse(readFileSync(${JSON.stringify(queuePayloadPath)}, "utf8"));
if (typeof payload.cache_key !== "string" || payload.cache_key.length === 0) {
  throw new Error("queue payload missing cache_key");
}
const cacheWorkerUrl = ${JSON.stringify(cacheWorkerUrl)};
const token = ${JSON.stringify(internalToken)};
if (!cacheWorkerUrl) {
  throw new Error("CINDER_CACHE_WORKER_URL is required for cache reset");
}
const exp = Math.floor(Date.now() / 1000) + 3600;
const message = "delete:" + payload.cache_key + ":" + exp;
const sig = crypto.createHmac("sha256", token).update(message).digest("hex");
const deleteUrl = cacheWorkerUrl + "/objects/" + payload.cache_key + "?op=delete&exp=" + exp + "&sig=" + sig;
const deleteResponse = await fetch(deleteUrl, {
  method: "DELETE",
});
if (!deleteResponse.ok) {
  throw new Error("cache reset failed: " + deleteResponse.status);
}
const response = await fetch(
  ${JSON.stringify(baseUrl)} + "/cache/restore/" + payload.cache_key,
  {
    method: "POST",
    headers: {
      Authorization: "Bearer " + ${JSON.stringify(internalToken)},
    },
  },
);
if (!response.ok) {
  throw new Error("cache restore failed: " + response.status);
}
console.log(await response.text());'`,
            ),
          ],
          assert: [
            Assert.noErrors(),
            Assert.hasAction("cache_miss"),
            Assert.responseBodyIncludes(`"miss":true`),
          ],
          timeoutMs: 5_000,
        }),
      },
      {
        id: "runner",
        title: "A runner can execute a queued GitHub job",
        gate: Gate.define({
          observe: workerLogs,
          prerequisites: [
            Require.env(
              "CLOUDFLARE_ACCOUNT_ID",
              "CLOUDFLARE_ACCOUNT_ID is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CLOUDFLARE_API_TOKEN",
              "CLOUDFLARE_API_TOKEN is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CINDER_INTERNAL_TOKEN",
              "CINDER_INTERNAL_TOKEN is required for runner registration.",
            ),
            Require.env(
              "CINDER_BASE_URL",
              "Run bun run provision first or set CINDER_BASE_URL to the live orchestrator URL.",
            ),
            Require.env(
              "GITHUB_PAT",
              "GITHUB_PAT is required to confirm the queued GitHub run completed.",
            ),
          ],
          act: [
            Act.exec(
              `curl -sf ${baseUrl}/jobs/peek \
                -H "Authorization: Bearer ${internalToken}" \
                > "${runnerJobPath}"`,
            ),
            Act.exec(
              `sh -c 'if [ -f "${agentPidPath}" ] && kill -0 "$(cat "${agentPidPath}")" 2>/dev/null; then exit 0; fi; : >"${agentLogPath}"; cargo run --quiet -p cinder-agent -- --url "${baseUrl}" --token "${internalToken}" --poll-ms 250 >"${agentLogPath}" 2>&1 & echo $! >"${agentPidPath}"; sleep 5'`,
            ),
            Act.exec(
              `bun -e 'import { existsSync, readFileSync } from "node:fs";
const payload = JSON.parse(readFileSync(${JSON.stringify(runnerJobPath)}, "utf8"));
if (typeof payload.run_id !== "number") {
  throw new Error("queue payload missing run_id");
}
if (typeof payload.repo_full_name !== "string" || payload.repo_full_name.length === 0) {
  throw new Error("queue payload missing repo_full_name");
}
const token = process.env.GITHUB_PAT;
if (!token) {
  throw new Error("GITHUB_PAT is required");
}
const headers = {
  Accept: "application/vnd.github+json",
  Authorization: "Bearer " + token,
  "X-GitHub-Api-Version": "2022-11-28",
};
const deadline = Date.now() + 600000;
let run = null;
while (Date.now() < deadline) {
  const response = await fetch(
    "https://api.github.com/repos/" + payload.repo_full_name + "/actions/runs/" + payload.run_id,
    { headers },
  );
  if (!response.ok) {
    throw new Error("GitHub workflow run fetch failed: " + response.status);
  }
  run = await response.json();
  if (run.status === "completed") {
    break;
  }
  await Bun.sleep(2000);
}
if (!run || run.status !== "completed") {
  throw new Error("GitHub workflow run did not complete");
}
const logNeedle = "completed with exit code 0";
const logDeadline = Date.now() + 30000;
while (Date.now() < logDeadline) {
  if (existsSync(${JSON.stringify(agentLogPath)})) {
    const logContents = readFileSync(${JSON.stringify(agentLogPath)}, "utf8");
    if (logContents.includes(logNeedle)) {
      break;
    }
  }
  await Bun.sleep(500);
}
console.log(JSON.stringify(run));
if (existsSync(${JSON.stringify(agentLogPath)})) {
  console.log(readFileSync(${JSON.stringify(agentLogPath)}, "utf8"));
}
if (run.conclusion !== "success") {
  process.exit(1);
}'`,
              {
                timeoutMs: 600_000,
              },
            ),
          ],
          assert: [
            Assert.noErrors(),
            Assert.hasAction("runner_registered"),
            Assert.hasAction("runner_pool_updated"),
            Assert.hasAction("job_dequeued"),
            Assert.responseBodyIncludes(`"conclusion":"success"`),
            Assert.responseBodyIncludes("starting github runner for job"),
            Assert.responseBodyIncludes("completed with exit code 0"),
          ],
          timeoutMs: 600_000,
        }),
      },
      {
        id: "cache-push",
        title: "The cold fixture run uploads a real cache archive",
        gate: Gate.define({
          observe: cacheWorkerLogs,
          prerequisites: [
            Require.env(
              "CLOUDFLARE_ACCOUNT_ID",
              "CLOUDFLARE_ACCOUNT_ID is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CLOUDFLARE_API_TOKEN",
              "CLOUDFLARE_API_TOKEN is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CINDER_INTERNAL_TOKEN",
              "CINDER_INTERNAL_TOKEN is required for cache upload.",
            ),
            Require.env(
              "CINDER_BASE_URL",
              "Run bun run provision first or set CINDER_BASE_URL to the live orchestrator URL.",
            ),
          ],
          act: [
            Act.exec(
              `bun -e 'import crypto from "node:crypto";
import { readFileSync } from "node:fs";
const payload = JSON.parse(readFileSync(${JSON.stringify(queuePayloadPath)}, "utf8"));
if (typeof payload.cache_key !== "string" || payload.cache_key.length === 0) {
  throw new Error("queue payload missing cache_key");
}
const cacheWorkerUrl = ${JSON.stringify(cacheWorkerUrl)};
const token = ${JSON.stringify(internalToken)};
if (!cacheWorkerUrl) {
  throw new Error("CINDER_CACHE_WORKER_URL is required for cache archive verification");
}
if (!token) {
  throw new Error("CINDER_INTERNAL_TOKEN is required for cache archive verification");
}
const exp = Math.floor(Date.now() / 1000) + 3600;
const message = "get:" + payload.cache_key + ":" + exp;
const sig = crypto.createHmac("sha256", token).update(message).digest("hex");
const url = cacheWorkerUrl + "/objects/" + payload.cache_key + "?op=get&exp=" + exp + "&sig=" + sig;
const deadline = Date.now() + 180000;
let response = null;
while (Date.now() < deadline) {
  response = await fetch(url);
  if (response.ok) {
    break;
  }
  if (response.status !== 404) {
    throw new Error("cache archive fetch failed: " + response.status);
  }
  await Bun.sleep(1000);
}
if (!response || !response.ok) {
  throw new Error("cache archive fetch failed: " + (response ? response.status : "timeout"));
}
const bytes = new Uint8Array(await response.arrayBuffer());
if (bytes.length === 0) {
  throw new Error("cache archive was empty");
}
const archivePath = ${JSON.stringify(cacheArchivePath)};
await Bun.write(archivePath, bytes);
const proc = Bun.spawn(["tar", "-tJf", archivePath], {
  stdout: "ignore",
  stderr: "pipe",
});
const exitCode = await proc.exited;
const stderr = await new Response(proc.stderr).text();
if (exitCode !== 0) {
  throw new Error("cache archive is unreadable: " + (stderr || exitCode));
}
console.log("cache archive verified");'`,
            ),
          ],
          assert: [
            Assert.noErrors(),
            Assert.hasAction("cache_object_served"),
          ],
          timeoutMs: 180_000,
        }),
      },
      {
        id: "speed-claim",
        title: "A warm GitHub workflow run is materially faster than cold",
        gate: Gate.define({
          observe: workerLogs,
          prerequisites: [
            Require.env(
              "CLOUDFLARE_ACCOUNT_ID",
              "CLOUDFLARE_ACCOUNT_ID is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "CLOUDFLARE_API_TOKEN",
              "CLOUDFLARE_API_TOKEN is required for Cloudflare worker log observation.",
            ),
            Require.env(
              "GITHUB_PAT",
              "GITHUB_PAT is required to confirm the warm GitHub run completed.",
            ),
            Require.env(
              "CINDER_FIXTURE_BRANCH",
              "Run bun run provision first or set CINDER_FIXTURE_BRANCH for the GitHub proof fixture.",
            ),
            Require.env(
              "CINDER_FIXTURE_WORKFLOW",
              "Run bun run provision first or set CINDER_FIXTURE_WORKFLOW for the GitHub proof fixture.",
            ),
          ],
          act: [
            Act.exec(
              `bun -e 'import { readFileSync } from "node:fs";
const coldPayload = JSON.parse(readFileSync(${JSON.stringify(runnerJobPath)}, "utf8"));
if (typeof coldPayload.run_id !== "number") {
  throw new Error("runner payload missing cold run_id");
}
if (typeof coldPayload.repo_full_name !== "string" || coldPayload.repo_full_name.length === 0) {
  throw new Error("runner payload missing repo_full_name");
}
const token = process.env.GITHUB_PAT;
if (!token) {
  throw new Error("GITHUB_PAT is required");
}
const headers = {
  Accept: "application/vnd.github+json",
  Authorization: "Bearer " + token,
  "X-GitHub-Api-Version": "2022-11-28",
};
const coldRunResponse = await fetch(
  "https://api.github.com/repos/" + coldPayload.repo_full_name + "/actions/runs/" + coldPayload.run_id,
  { headers },
);
if (!coldRunResponse.ok) {
  throw new Error("GitHub cold workflow run fetch failed: " + coldRunResponse.status);
}
const coldRun = await coldRunResponse.json();
if (coldRun.status !== "completed" || coldRun.conclusion !== "success") {
  throw new Error("cold workflow run is not complete and successful");
}
if (typeof coldRun.run_started_at !== "string" || typeof coldRun.updated_at !== "string") {
  throw new Error("cold workflow run missing timing data");
}
const coldDurationMs =
  new Date(coldRun.updated_at).getTime() - new Date(coldRun.run_started_at).getTime();
const listUrl =
  "https://api.github.com/repos/" +
  ${JSON.stringify(fixtureRepo)} +
  "/actions/workflows/" +
  ${JSON.stringify(fixtureWorkflow)} +
  "/runs?event=workflow_dispatch&branch=" +
  encodeURIComponent(${JSON.stringify(fixtureBranch)}) +
  "&per_page=20";
const beforeResponse = await fetch(listUrl, { headers });
if (!beforeResponse.ok) {
  throw new Error("GitHub workflow run listing failed: " + beforeResponse.status);
}
const beforePayload = await beforeResponse.json();
const beforeRuns = Array.isArray(beforePayload.workflow_runs) ? beforePayload.workflow_runs : [];
let latestKnownRunId = 0;
for (const run of beforeRuns) {
  if (typeof run?.id === "number" && run.id > latestKnownRunId) {
    latestKnownRunId = run.id;
  }
}
const dispatchResponse = await fetch(
  "https://api.github.com/repos/" +
    ${JSON.stringify(fixtureRepo)} +
    "/actions/workflows/" +
    ${JSON.stringify(fixtureWorkflow)} +
    "/dispatches",
  {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: ${JSON.stringify(fixtureBranch)} }),
  },
);
if (!dispatchResponse.ok) {
  throw new Error("GitHub workflow dispatch failed: " + dispatchResponse.status);
}
const runDeadline = Date.now() + 600000;
let warmRunId = 0;
while (Date.now() < runDeadline && warmRunId === 0) {
  const runsResponse = await fetch(listUrl, { headers });
  if (!runsResponse.ok) {
    throw new Error("GitHub workflow run listing failed: " + runsResponse.status);
  }
  const runsPayload = await runsResponse.json();
  const runs = Array.isArray(runsPayload.workflow_runs) ? runsPayload.workflow_runs : [];
  for (const run of runs) {
    if (typeof run?.id === "number" && run.id > latestKnownRunId) {
      warmRunId = run.id;
      break;
    }
  }
  if (!warmRunId) {
    await Bun.sleep(2000);
  }
}
if (!warmRunId) {
  throw new Error("warm workflow run was not created");
}
let warmRun = null;
while (Date.now() < runDeadline) {
  const runResponse = await fetch(
    "https://api.github.com/repos/" + coldPayload.repo_full_name + "/actions/runs/" + warmRunId,
    { headers },
  );
  if (!runResponse.ok) {
    throw new Error("GitHub warm workflow run fetch failed: " + runResponse.status);
  }
  warmRun = await runResponse.json();
  if (warmRun.status === "completed") {
    break;
  }
  await Bun.sleep(2000);
}
if (!warmRun || warmRun.status !== "completed") {
  throw new Error("warm workflow run did not complete");
}
if (typeof warmRun.run_started_at !== "string" || typeof warmRun.updated_at !== "string") {
  throw new Error("warm workflow run missing timing data");
}
const warmDurationMs =
  new Date(warmRun.updated_at).getTime() - new Date(warmRun.run_started_at).getTime();
const speedDeltaMs = coldDurationMs - warmDurationMs;
console.log(JSON.stringify(warmRun));
console.log("cold_run_duration_ms=" + coldDurationMs);
console.log("warm_run_duration_ms=" + warmDurationMs);
console.log("speed_delta_ms=" + speedDeltaMs);'`,
              {
                timeoutMs: 600_000,
              },
            ),
          ],
          assert: [
            Assert.noErrors(),
            Assert.hasAction("cache_hit"),
            Assert.responseBodyIncludes(`"conclusion":"success"`),
            Assert.numericDeltaFromEnv({
              source: "logMessage",
              pattern: "speed_delta_ms=(\\d+)",
              baselineEnv: "SPEED_THRESHOLD_MS",
              minimumDelta: 0,
            }),
          ],
          timeoutMs: 600_000,
        }),
      },
    ],
    loop: {
      maxIterations: 1,
      stopOnFailure: true,
    },
    cleanup: {
      actions: [
        Act.exec(
          `if [ -n "${internalToken}" ] && [ -n "${baseUrl}" ]; then curl -sf -X DELETE ${baseUrl}/runners/${localRunnerId} -H "Authorization: Bearer ${internalToken}" >/dev/null; else exit 0; fi`,
        ),
      ],
    },
  }),
} satisfies ScopeFile;

export default scope;

if (import.meta.main) {
  stopManagedAgent();
  stopManagedHarness();
  resetProofArtifacts();

  if (testRepo) {
    await ensureLocalHarness();
  }

  await ensureColdBuildBaseline();

  try {
    const result = await Effect.runPromise(
      Plan.runLoop(scope.plan, {
        maxIterations: scope.plan.loop?.maxIterations,
      }),
    );

    console.log(JSON.stringify(result, null, 2));

    if (result.status !== "pass") {
      process.exitCode = 1;
    }
  } finally {
    stopManagedAgent();
    stopManagedHarness();
  }

  process.exit(process.exitCode ?? 0);
}
```

Status: Structurally ready

Typechecked against the local Gateproof package. Running it end-to-end still requires live Cloudflare infrastructure and the real Cinder environment variables.

## Roadmap

Gateproof is not ready to fully dogfood itself on a case study like Cinder yet. The next phase is about tightening the guardrails, not adding another rewrite.

- Save the latest real proof result to disk so the loop always has a concrete last-known truth.
- Make finalize refuse to ship unless the saved real proof result is fully green.
- Separate the real proof path from side experiments so exploration can happen without polluting the proof story.
- Let plans choose direct evidence when log tailing is flaky, so a valid live pass does not fail on observation noise alone.
- Dogfood Gateproof on Cinder again only after those guardrails are in place.

## How To

Task: Provision infrastructure once. Then let plan.ts prove the live product.

Done when: Gateproof only goes green when the live system can do the work and the product claim holds.

Run it:

```bash
bun run example:hello-world:worker
bun run alchemy.run.ts
bun run plan.ts
```

## Breaking Changes In 0.4.0

- `Prd.*` is gone
- `Claim.*` is gone
- `plan.ts` is the canonical entrypoint
- `Plan.*` replaces the old front door

## Reference

Files:
- `examples/hello-world/plan.ts`
- `alchemy.run.ts`
- `plan.ts`

Canonical gates:
- A GitHub webhook queues a runnable job
- A queued job can be dequeued
- A runner can register into the pool
- A missing cache key returns a clean miss
- The cache upload path returns a usable upload URL
- A warm build is materially faster than cold

Loop:
- `maxIterations: 1`
- `stopOnFailure: true`

Core API:
- `Gate.define(...)`
- `Plan.define(...)`
- `Plan.run(...)`
- `Plan.runLoop(...)`
- `Cloudflare.observe(...)`
- `Assert.hasAction(...)`
- `Assert.responseBodyIncludes(...)`
- `Assert.numericDeltaFromEnv(...)`

## Explanation

alchemy.run.ts provisions once. plan.ts reruns the proof loop against the live deployment.
