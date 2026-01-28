#!/usr/bin/env bun
/**
 * Production Smoke Gate
 *
 * Validates that production deployment is accessible and core endpoints work.
 *
 * Usage:
 *   bun run gates/production/smoke.gate.ts
 *
 * Environment variables:
 *   PRODUCTION_URL - Production URL (defaults to https://gateproof.dev)
 */

import { Gate, Act, Assert, createHttpObserveResource } from "../../src/index";
import { runGateWithErrorHandling } from "../../src/utils";

const productionUrl = process.env.PRODUCTION_URL || "https://gateproof.dev";

export async function run() {
  console.log(`🚪 Running Production Smoke Gate: ${productionUrl}`);
  console.log("");

  // Gate 1: Homepage loads correctly
  console.log("📄 Gate 1: Homepage loads correctly");
  const homepageGate = {
    name: "production-homepage",
    observe: createHttpObserveResource({ url: productionUrl, pollInterval: 500 }),
    act: [Act.wait(500)],
    assert: [
      Assert.custom("homepage_accessible", async (logs) => {
        const httpLog = logs.find(l => l.stage === "http");
        if (!httpLog) return false;
        if (httpLog.status !== "success") return false;
        const body = httpLog.data?.body as string;
        if (!body) return false;
        if (!body) return false;
        const titleMatch = body.match(/<title[^>]*>([^<]*)<\/title>/i);
        if (titleMatch && titleMatch[1]?.toLowerCase().includes("gateproof")) {
          return true;
        }
        return body.toLowerCase().includes("gateproof");
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
    observe: createHttpObserveResource({ url: `${productionUrl}/api/health`, pollInterval: 500 }),
    act: [Act.wait(500)],
    assert: [
      Assert.custom("health_endpoint_works", async (logs) => {
        const httpLog = logs.find(l => l.stage === "http");
        if (!httpLog) return false;
        if (httpLog.status !== "success") return false;
        const body = httpLog.data?.body as { status?: string; timestamp?: string };
        if (!body) return false;
        return body.status === "ok" && typeof body.timestamp === "string";
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
    observe: createHttpObserveResource({ url: `${productionUrl}/api/test`, pollInterval: 500 }),
    act: [Act.wait(500)],
    assert: [
      Assert.custom("test_endpoint_works", async (logs) => {
        const httpLog = logs.find(l => l.stage === "http");
        if (!httpLog) return false;
        if (httpLog.status !== "success") return false;
        const body = httpLog.data?.body as {
          success?: boolean;
          action?: string;
          timestamp?: string;
          message?: string;
          log?: { requestId?: string; action?: string };
        };
        if (!body) return false;
        return body.success === true &&
               typeof body.action === "string" &&
               typeof body.timestamp === "string" &&
               typeof body.message === "string" &&
               typeof body.log?.requestId === "string";
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
  } else {
    console.log("❌ Some gates failed. Production is not ready.");
  }

  return { status: allPassed ? "success" : "failed" };
}

if (import.meta.main) {
  run()
    .then((result) => {
      process.exit(result.status === "success" ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Fatal error:", error);
      process.exit(1);
    });
}
