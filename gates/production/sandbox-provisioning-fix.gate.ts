#!/usr/bin/env bun
/**
 * Production Sandbox Provisioning Fix Gate
 *
 * Validates that the Cloudflare Sandbox container provisioning issue is fixed
 * and both /api/prd/run and /api/prd/run/diagnose work end-to-end.
 *
 * Usage:
 *   bun run gates/production/sandbox-provisioning-fix.gate.ts
 *
 * Environment variables:
 *   PRODUCTION_URL - Production URL (defaults to https://gateproof.dev)
 */

import { Gate, Act, Assert, createHttpObserveResource } from "../../src/index";

const productionUrl = process.env.PRODUCTION_URL || "https://gateproof.dev";

// Test PRD file that should execute successfully
const testPrdFile = `console.log("sandbox provisioning fixed!");
process.exit(0);
`;

export async function run() {
  console.log(`🚪 Running Production Sandbox Provisioning Fix Gate: ${productionUrl}`);
  console.log("");

  // Test 1: Diagnose endpoint should work
  const diagnoseGate = {
    name: "sandbox-diagnose-fixed",
    observe: createHttpObserveResource({
      url: `${productionUrl}/api/prd/run/diagnose`,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
      pollInterval: 2000,
      timeoutMs: 15000,
    }),
    act: [Act.wait(200)],
    assert: [
      Assert.custom("sandbox_diagnose_fixed", async (logs) => {
        const httpLog = logs.find((log) => log.stage === "http");
        if (!httpLog || httpLog.status !== "success") return false;
        const body = httpLog.data?.body as { ok?: boolean; step?: string } | undefined;
        return body?.ok === true && body?.step === "complete";
      }),
    ],
    stop: { idleMs: 1000, maxMs: 20000 },
  };

  // Test 2: Run endpoint should execute PRD successfully
  const runGate = {
    name: "sandbox-run-fixed",
    observe: createHttpObserveResource({
      url: `${productionUrl}/api/prd/run`,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prdFile: testPrdFile,
        apiUrl: "https://example.test",
        testUrl: "http://localhost:3000",
      }),
      pollInterval: 2000,
      timeoutMs: 25000,
    }),
    act: [Act.wait(200)],
    assert: [
      Assert.custom("sandbox_run_sse_fixed", async (logs) => {
        const httpLog = logs.find((log) => log.stage === "http");
        if (!httpLog || httpLog.status !== "success") return false;
        const body = httpLog.data?.body;
        if (typeof body !== "string") return false;
        return body.includes("event: complete") && body.includes("\"exitCode\":0");
      }),
    ],
    stop: { idleMs: 1000, maxMs: 30000 },
  };

  console.log("🔍 Testing sandbox diagnose endpoint...");
  const diagnoseResult = await Gate.run(diagnoseGate);
  console.log(`   Diagnose: ${diagnoseResult.status === "success" ? "✅ PASSED" : "❌ FAILED"}`);

  console.log("🔍 Testing sandbox run endpoint...");
  const runResult = await Gate.run(runGate);
  console.log(`   Run: ${runResult.status === "success" ? "✅ PASSED" : "❌ FAILED"}`);

  const overallSuccess = diagnoseResult.status === "success" && runResult.status === "success";
  
  console.log("");
  if (overallSuccess) {
    console.log("✅ Production sandbox provisioning fix gate passed.");
    console.log("   Both sandbox endpoints are working correctly.");
  } else {
    console.log("❌ Production sandbox provisioning fix gate failed.");
    console.log("   Sandbox container provisioning still has issues.");
  }

  return { status: overallSuccess ? "success" : "failed" as const };
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