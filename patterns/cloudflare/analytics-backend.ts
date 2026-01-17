#!/usr/bin/env bun
/**
 * Cloudflare Analytics Engine Pattern
 * 
 * Shows how to use gateproof with Cloudflare Analytics Engine.
 * This is the recommended backend for production use.
 */

import { Gate, Act, Assert } from "../../src/index";
import { CloudflareProvider } from "../../src/cloudflare/index";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
const apiToken = process.env.CLOUDFLARE_API_TOKEN!;
const dataset = process.env.DATASET || "worker_logs";

if (!accountId || !apiToken) {
  console.error("Error: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required");
  process.exit(1);
}

const provider = CloudflareProvider({ accountId, apiToken });

const gate = {
  name: "analytics-backend-example",
  observe: provider.observe({
    backend: "analytics",
    dataset,
    pollInterval: 1000 // Poll every second
  }),
  act: [
    Act.exec("curl https://my-worker.workers.dev/api/test"),
    Act.wait(2000) // Wait for logs to propagate
  ],
  assert: [
    Assert.noErrors(),
    Assert.hasAction("request_received"),
    Assert.hasStage("worker")
  ],
  stop: { idleMs: 3000, maxMs: 15000 }
};

Gate.run(gate)
  .then((result) => {
    console.log(`Status: ${result.status}`);
    console.log(`Duration: ${result.durationMs}ms`);
    console.log(`Actions seen: ${result.evidence.actionsSeen.join(", ") || "none"}`);
    
    if (result.status !== "success") {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
