#!/usr/bin/env bun
/**
 * Production Smoke Gate
 * 
 * Validates that production deployment is accessible and core endpoints work.
 * This is a "gate" that must pass before considering the deployment successful.
 * 
 * Usage:
 *   bun run gates/production/smoke.gate.ts
 * 
 * Environment variables:
 *   PRODUCTION_URL - Production URL (defaults to https://gateproof.coey.dev)
 */

import { Gate, Act, Assert } from "../../src/index";
import { createEmptyObserveResource, runGateWithErrorHandling } from "../../src/utils";

const productionUrl = process.env.PRODUCTION_URL || "https://gateproof.coey.dev";

async function main() {
  console.log(`🚪 Running Production Smoke Gate: ${productionUrl}`);
  console.log("");

  // Gate 1: Homepage loads correctly
  console.log("📄 Gate 1: Homepage loads correctly");
  const homepageGate = {
    name: "production-homepage",
    observe: createEmptyObserveResource(),
    act: [
      Act.wait(500),
    ],
    assert: [
      Assert.custom("homepage_accessible", async () => {
        const response = await fetch(productionUrl);
        if (!response.ok) return false;
        const html = await response.text();
        return html.includes("gateproof") && 
               html.includes("Building Software in Reverse");
      }),
    ],
    stop: { idleMs: 1000, maxMs: 10000 },
    report: "json" as const,
  };

  const homepageResult = await runGateWithErrorHandling(homepageGate, "homepage");
  console.log(`   Status: ${homepageResult.status}`);
  console.log(`   Duration: ${homepageResult.durationMs}ms`);
  if (homepageResult.status === "failed" && homepageResult.error) {
    console.log(`   Error: ${homepageResult.error.message || JSON.stringify(homepageResult.error)}`);
  }
  console.log("");

  // Gate 2: Health endpoint works
  console.log("🏥 Gate 2: Health endpoint works");
  const healthGate = {
    name: "production-health",
    observe: createEmptyObserveResource(),
    act: [
      Act.wait(500),
    ],
    assert: [
      Assert.custom("health_endpoint_works", async () => {
        const response = await fetch(`${productionUrl}/api/health`);
        if (!response.ok) return false;
        const data = await response.json();
        return data.status === "ok" && typeof data.timestamp === "string";
      }),
    ],
    stop: { idleMs: 1000, maxMs: 10000 },
    report: "json" as const,
  };

  const healthResult = await runGateWithErrorHandling(healthGate, "health");
  console.log(`   Status: ${healthResult.status}`);
  console.log(`   Duration: ${healthResult.durationMs}ms`);
  if (healthResult.status === "failed" && healthResult.error) {
    console.log(`   Error: ${healthResult.error.message || JSON.stringify(healthResult.error)}`);
  }
  console.log("");

  // Gate 3: Test endpoint works
  console.log("🧪 Gate 3: Test endpoint works");
  const testGate = {
    name: "production-test-endpoint",
    observe: createEmptyObserveResource(),
    act: [
      Act.wait(500),
    ],
    assert: [
      Assert.custom("test_endpoint_works", async () => {
        const response = await fetch(`${productionUrl}/api/test`);
        if (!response.ok) return false;
        const data = await response.json();
        return data.success === true && 
               typeof data.requestId === "string" &&
               typeof data.durationMs === "number";
      }),
    ],
    stop: { idleMs: 1000, maxMs: 10000 },
    report: "json" as const,
  };

  const testResult = await runGateWithErrorHandling(testGate, "test");
  console.log(`   Status: ${testResult.status}`);
  console.log(`   Duration: ${testResult.durationMs}ms`);
  if (testResult.status === "failed" && testResult.error) {
    console.log(`   Error: ${testResult.error.message || JSON.stringify(testResult.error)}`);
  }
  console.log("");

  // Summary
  console.log("📊 Gate Summary:");
  const allPassed = homepageResult.status === "success" && 
                    healthResult.status === "success" && 
                    testResult.status === "success";
  
  console.log(`   Homepage: ${homepageResult.status === "success" ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`   Health: ${healthResult.status === "success" ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`   Test Endpoint: ${testResult.status === "success" ? "✅ PASSED" : "❌ FAILED"}`);
  console.log("");

  if (allPassed) {
    console.log("✅ All gates passed! Production is ready.");
    process.exit(0);
  } else {
    console.log("❌ Some gates failed. Production is not ready.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
