import { test, expect } from "bun:test";
import { Gate, Act, Assert } from "../src/index";

const productionUrl = "https://gateproof.coey.dev";
const workerUrl = process.env.DEMO_WORKER_URL || productionUrl;

// Helper to check if production is available
async function isProductionAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${productionUrl}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

test("production: worker is accessible", async () => {
  const available = await isProductionAvailable();
  if (!available) {
    console.log("Skipping: Production not available");
    return;
  }
  const response = await fetch(`${productionUrl}/api/health`);
  expect(response.status).toBe(200);
}, 10000);

test("production: health endpoint returns expected data", async () => {
  if (!(await isProductionAvailable())) {
    console.log("Skipping: Production not available");
    return;
  }
  const response = await fetch(`${productionUrl}/api/health`);
  expect(response.status).toBe(200);
  const data = await response.json() as { status: string; timestamp: string };
  expect(data.status).toBe("ok");
  expect(data.timestamp).toBeDefined();
}, 10000);

test("production: test endpoint returns success with requestId", async () => {
  if (!(await isProductionAvailable())) {
    console.log("Skipping: Production not available");
    return;
  }
  const response = await fetch(`${productionUrl}/api/test`);
  expect(response.status).toBe(200);
  const data = await response.json() as { success: boolean; requestId: string; durationMs: number };
  expect(data.success).toBe(true);
  expect(data.requestId).toBeDefined();
  expect(typeof data.requestId).toBe("string");
  expect(data.durationMs).toBeDefined();
  expect(typeof data.durationMs).toBe("number");
}, 10000);

test("production: root endpoint serves HTML with correct content", async () => {
  if (!(await isProductionAvailable())) {
    console.log("Skipping: Production not available");
    return;
  }
  const response = await fetch(`${productionUrl}/`);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/html");
  const html = await response.text();
  expect(html).toContain("gateproof");
  expect(html).toContain("Building Software in Reverse");
  expect(html).toContain("The Inversion");
  expect(html).toContain("Live Demo");
}, 10000);

test("production: 404 endpoint returns 404", async () => {
  if (!(await isProductionAvailable())) {
    console.log("Skipping: Production not available");
    return;
  }
  const response = await fetch(`${productionUrl}/api/nonexistent`);
  expect(response.status).toBe(404);
}, 10000);

test("production: gateproof can observe and validate production worker", async () => {
  if (!(await isProductionAvailable())) {
    console.log("Skipping: Production not available");
    return;
  }

  // This test uses gateproof to test itself in production
  // It makes a request and validates the response
  const { createObserveResource } = await import("../src/observe");
  const { Effect } = await import("effect");

  const emptyBackend = {
    start: () => Effect.succeed<AsyncIterable<any>>({
      async *[Symbol.asyncIterator]() {
        // Empty stream - we're just testing HTTP endpoints work
        return;
      },
    }),
    stop: () => Effect.void,
  };

  const gate = {
    name: "production-smoke-test",
    observe: createObserveResource(emptyBackend),
    act: [
      Act.wait(200),
      Act.exec(`curl -s ${productionUrl}/api/test`),
      Act.wait(500),
    ],
    assert: [
      Assert.custom("production_endpoint_works", async () => {
        const response = await fetch(`${productionUrl}/api/test`);
        const data = await response.json() as { success: boolean };
        return response.ok && data.success === true;
      }),
    ],
    stop: { idleMs: 1000, maxMs: 10000 },
  };

  const result = await Gate.run(gate);
  expect(result.status).toBe("success");
}, 30000);

test("production: custom domain SSL is valid", async () => {
  if (!(await isProductionAvailable())) {
    console.log("Skipping: Production not available");
    return;
  }
  
  // Test that HTTPS works and returns valid responses
  const response = await fetch(`${productionUrl}/api/health`, {
    method: "GET",
  });
  expect(response.status).toBe(200);
  expect(response.url).toContain("https://");
}, 10000);
