#!/usr/bin/env bun
/**
 * CLI Stream Pattern (Local Development)
 * 
 * Shows how to use gateproof with wrangler's CLI stream for local development.
 * This connects to a running `wrangler dev` session.
 */

import { Gate, Act, Assert } from "../../src/index";
import { CloudflareProvider } from "../../src/cloudflare/index";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const workerName = process.env.WORKER_NAME || "my-worker";

const provider = CloudflareProvider({ accountId, apiToken: "" });

const gate = {
  name: "cli-stream-example",
  observe: provider.observe({
    backend: "cli-stream",
    workerName
  }),
  act: [
    Act.browser({ url: "http://localhost:8787", headless: true }),
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
