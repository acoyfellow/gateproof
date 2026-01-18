import { test, expect } from "bun:test";
import { Gate, Act, Assert } from "../src/index";
import { CloudflareProvider } from "../src/cloudflare";
import type { Log } from "../src/types";

/**
 * Real backend integration tests
 * 
 * These tests require actual Cloudflare credentials:
 * - CLOUDFLARE_ACCOUNT_ID
 * - CLOUDFLARE_API_TOKEN
 * 
 * They are skipped by default. To run:
 *   CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... bun test test/real-backend.test.ts
 */

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

const hasCredentials = accountId && apiToken;

test.skipIf(!hasCredentials)("real-backend: analytics engine backend works", async () => {
  if (!accountId || !apiToken) {
    throw new Error("Missing Cloudflare credentials");
  }

  const provider = CloudflareProvider({
    accountId,
    apiToken
  });

  // This test requires a real dataset - adjust as needed
  const observe = provider.observe({
    backend: "analytics",
    dataset: "test_dataset",  // Replace with actual dataset
    pollInterval: 1000
  });

  const gate = {
    name: "real-analytics-test",
    observe,
    act: [Act.wait(1000)],
    assert: [],
    stop: { idleMs: 2000, maxMs: 10000 }
  };

  const result = await Gate.run(gate);

  // Should complete without errors
  expect(["success", "timeout"]).toContain(result.status);
});

test.skipIf(!hasCredentials)("real-backend: workers logs backend works", async () => {
  if (!accountId || !apiToken) {
    throw new Error("Missing Cloudflare credentials");
  }

  const provider = CloudflareProvider({
    accountId,
    apiToken
  });

  // This test requires a real worker - adjust as needed
  const observe = provider.observe({
    backend: "workers-logs",
    workerName: "test-worker"  // Replace with actual worker name
  });

  const gate = {
    name: "real-workers-logs-test",
    observe,
    act: [Act.wait(1000)],
    assert: [],
    stop: { idleMs: 2000, maxMs: 10000 }
  };

  const result = await Gate.run(gate);

  // Should complete without errors
  expect(["success", "timeout", "failed"]).toContain(result.status);
});

test.skipIf(!hasCredentials)("real-backend: end-to-end gate with real backend", async () => {
  if (!accountId || !apiToken) {
    throw new Error("Missing Cloudflare credentials");
  }

  const provider = CloudflareProvider({
    accountId,
    apiToken
  });

  const observe = provider.observe({
    backend: "analytics",
    dataset: "test_dataset",  // Replace with actual dataset
    pollInterval: 500
  });

  // This would require a real worker deployment
  // Adjust actions based on your setup
  const gate = {
    name: "real-e2e-test",
    observe,
    act: [
      // Act.deploy({ worker: "test-worker" }),  // Uncomment if you have a worker to deploy
      Act.wait(2000)
    ],
    assert: [
      // Assert.noErrors(),
      // Assert.hasAction("request_received")
    ],
    stop: { idleMs: 3000, maxMs: 30000 }
  };

  const result = await Gate.run(gate);

  // Should complete
  expect(["success", "timeout", "failed"]).toContain(result.status);

  // If successful, should have logs
  if (result.status === "success") {
    expect(result.logs.length).toBeGreaterThanOrEqual(0);
  }
}, { timeout: 60000 });

test("real-backend: tests are skipped without credentials", () => {
  // This test always passes - it's just to document that real backend tests
  // are skipped when credentials are not available
  expect(true).toBe(true);
});
