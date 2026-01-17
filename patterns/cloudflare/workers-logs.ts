#!/usr/bin/env bun
/**
 * Cloudflare Workers Logs API Pattern
 * 
 * Shows how to use gateproof with the Workers Logs API.
 * Useful when you need real-time log access.
 */

import { Gate, Act, Assert } from "../../src/index";
import { CloudflareProvider } from "../../src/cloudflare/index";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
const apiToken = process.env.CLOUDFLARE_API_TOKEN!;
const workerName = process.env.WORKER_NAME || "my-worker";

if (!accountId || !apiToken) {
  console.error("Error: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required");
  process.exit(1);
}

const provider = CloudflareProvider({ accountId, apiToken });

const gate = {
  name: "workers-logs-example",
  observe: provider.observe({
    backend: "workers-logs",
    workerName,
    pollInterval: 1000
  }),
  act: [
    Act.browser({ url: `https://${workerName}.workers.dev`, headless: true }),
    Act.wait(2000)
  ],
  assert: [
    Assert.noErrors(),
    Assert.hasAction("request_received")
  ],
  stop: { idleMs: 3000, maxMs: 15000 }
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
