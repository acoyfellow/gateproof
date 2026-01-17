#!/usr/bin/env bun
/**
 * GitHub Actions CI/CD Pattern
 * 
 * Shows how to run gates in GitHub Actions.
 * 
 * This pattern demonstrates:
 * - Running gates in CI/CD
 * - Environment variable setup
 * - Failure handling
 * - Status reporting
 */

import { Gate, Act, Assert } from "../../src/index";
import { CloudflareProvider } from "../../src/cloudflare/index";

// In GitHub Actions, these come from secrets
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const apiToken = process.env.CLOUDFLARE_API_TOKEN || "";
const productionUrl = process.env.PRODUCTION_URL || "https://example.com";

if (!accountId || !apiToken) {
  console.error("Error: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required");
  process.exit(1);
}

const provider = CloudflareProvider({ accountId, apiToken });

// Example: Production smoke gate
const gate = {
  name: "ci-production-smoke",
  observe: provider.observe({
    backend: "analytics",
    dataset: "worker_logs"
  }),
  act: [
    Act.browser({ url: productionUrl, headless: true }),
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
    // In CI, exit code determines pass/fail
    if (result.status !== "success") {
      console.error(`❌ Gate failed: ${result.error?.message || "unknown error"}`);
      console.error(`Evidence: ${JSON.stringify(result.evidence, null, 2)}`);
      process.exit(1);
    }
    console.log("✅ Gate passed");
    console.log(`Duration: ${result.durationMs}ms`);
    console.log(`Actions seen: ${result.evidence.actionsSeen.join(", ")}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
