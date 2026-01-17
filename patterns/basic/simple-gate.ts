#!/usr/bin/env bun
/**
 * Simple Gate Pattern
 * 
 * Minimal example showing the core gateproof pattern:
 * 1. Define what to observe (backend)
 * 2. Define actions to take
 * 3. Define assertions to validate
 * 
 * This is the simplest possible gate - it demonstrates the minimal surface area.
 */

import { Gate, Act, Assert } from "../../src/index";
import { CloudflareProvider } from "../../src/cloudflare/index";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const apiToken = process.env.CLOUDFLARE_API_TOKEN || "";
const workerName = process.argv[2] || "my-worker";
const testUrl = process.argv[3] || `https://${workerName}.workers.dev/`;

if (!accountId || !apiToken) {
  console.error("Error: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required");
  process.exit(1);
}

const provider = CloudflareProvider({ accountId, apiToken });

const gate = {
  name: "simple-gate",
  observe: provider.observe({
    backend: "analytics",
    dataset: "worker_logs"
  }),
  act: [
    Act.browser({
      url: testUrl,
      headless: true,
      waitMs: 5000
    })
  ],
  assert: [Assert.noErrors()],
  stop: { idleMs: 3000, maxMs: 10000 }
};

Gate.run(gate)
  .then((result) => {
    if (result.status !== "success") {
      console.error(`❌ Gate failed: ${result.error?.message || "unknown error"}`);
      process.exit(1);
    }
    console.log("✅ Gate passed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
