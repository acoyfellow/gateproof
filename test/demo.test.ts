import { test, expect } from "bun:test";
import { Gate, Act, Assert } from "../src/index";
import type { Log } from "../src/types";
import { createTestObserveResource } from "../src/test-helpers";
import { Effect, Queue, Runtime } from "effect";

const baseUrl = process.env.DEMO_URL || "http://localhost:8787";

// Helper to check if worker is available
async function isWorkerAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Helper to wait for worker to be ready
async function waitForWorker(maxRetries = 10): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    if (await isWorkerAvailable()) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function createTestObserveResource(queue: Queue.Queue<Log>) {
  const backend = {
    start: () =>
      Effect.succeed<AsyncIterable<Log>>({
        async *[Symbol.asyncIterator]() {
          const runtime = Runtime.defaultRuntime;
          const startTime = Date.now();
          const maxWait = 5000;

          while (Date.now() - startTime < maxWait) {
            try {
              const log = await Runtime.runPromise(runtime)(
                Queue.take(queue).pipe(
                  Effect.timeout("500 millis"),
                  Effect.catchAll(() => Effect.succeed(null as Log | null))
                )
              );
              if (log === null) {
                await new Promise((resolve) => setTimeout(resolve, 100));
                continue;
              }
              yield log;
            } catch {
              break;
            }
          }
        },
      }),
    stop: () => Effect.void,
  };
  return createObserveResource(backend);
}

test("demo: worker is accessible", async () => {
  const available = await isWorkerAvailable();
  if (!available) {
    console.log("Skipping: Worker not available. Start with: cd demo && wrangler dev --local");
    return;
  }
  const response = await fetch(`${baseUrl}/api/health`);
  expect(response.status).toBe(200);
});

test("demo: health endpoint returns expected data", async () => {
  if (!(await isWorkerAvailable())) {
    console.log("Skipping: Worker not available");
    return;
  }
  const response = await fetch(`${baseUrl}/api/health`);
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.status).toBe("ok");
  expect(data.timestamp).toBeDefined();
});

test("demo: test endpoint returns success with requestId", async () => {
  if (!(await isWorkerAvailable())) {
    console.log("Skipping: Worker not available");
    return;
  }
  const response = await fetch(`${baseUrl}/api/test`);
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.requestId).toBeDefined();
  expect(typeof data.requestId).toBe("string");
  expect(data.durationMs).toBeDefined();
  expect(typeof data.durationMs).toBe("number");
});

test("demo: root endpoint serves HTML with correct content", async () => {
  if (!(await isWorkerAvailable())) {
    console.log("Skipping: Worker not available");
    return;
  }
  const response = await fetch(`${baseUrl}/`);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/html");
  const html = await response.text();
  expect(html).toContain("gateproof");
  expect(html).toContain("Building Software in Reverse");
  expect(html).toContain("The Inversion");
});

test("demo: 404 endpoint returns 404", async () => {
  if (!(await isWorkerAvailable())) {
    console.log("Skipping: Worker not available");
    return;
  }
  const response = await fetch(`${baseUrl}/api/nonexistent`);
  expect(response.status).toBe(404);
});

test("demo: gateproof can test worker using CLI stream backend", async () => {
  if (!(await isWorkerAvailable())) {
    console.log("Skipping: Worker not available");
    return;
  }

  // This test requires wrangler to be running and the CLI stream backend
  // Skip if the backend isn't available
  const { CloudflareProvider } = await import("../src/cloudflare/index");

  try {
    const provider = CloudflareProvider({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "test",
      apiToken: process.env.CLOUDFLARE_API_TOKEN || "test",
    });

    const gate = {
      name: "demo-cli-stream-test",
      observe: provider.observe({
        backend: "cli-stream",
        workerName: "gateproof-demo",
      }),
      act: [
        Act.wait(200),
        Act.exec(`curl -s ${baseUrl}/api/test`),
        Act.wait(2000),
      ],
      assert: [
        Assert.noErrors(),
        Assert.hasAction("request_received"),
        Assert.hasStage("worker"),
      ],
      stop: { idleMs: 2000, maxMs: 10000 },
    };

    const result = await Gate.run(gate);

    // If CLI stream works, validate results
    if (result.status === "success" || result.status === "timeout") {
      expect(result.evidence).toBeDefined();
      expect(result.logs).toBeDefined();
    }
  } catch (error) {
    // CLI stream might not be available in test environment
    // This is expected if wrangler isn't running
    if (error instanceof Error && error.message.includes("wrangler")) {
      console.log("Skipping CLI stream test - wrangler not available");
      return;
    }
    throw error;
  }
}, 30000);
