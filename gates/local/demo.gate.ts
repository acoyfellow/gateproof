#!/usr/bin/env bun
/**
 * Local Demo Gate
 *
 * Validates that the local demo worker is running and accessible.
 *
 * Usage:
 *   bun run gates/local/demo.gate.ts
 *
 * Environment variables:
 *   LOCAL_URL - Local worker URL (defaults to http://localhost:8787)
 */

import { Gate, Act, Assert, createHttpObserveResource } from "../../src/index";

const localUrl = process.env.LOCAL_URL || "http://localhost:8787";

export async function run() {
  // Skip in CI — this gate requires a local dev server
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    console.log("⏭️  Skipping local demo gate (CI environment)");
    return { status: "success" as const };
  }

  console.log(`🚪 Running Local Demo Gate: ${localUrl}`);
  console.log("");

  // Gate 1: Health endpoint
  console.log("🏥 Gate 1: Health endpoint");
  const healthGate = {
    name: "local-health",
    observe: createHttpObserveResource({ url: `${localUrl}/api/health`, pollInterval: 200 }),
    act: [Act.wait(200)],
    assert: [
      Assert.custom("health_works", async (logs) => {
        const httpLog = logs.find(l => l.stage === "http");
        return httpLog?.status === "success";
      }),
    ],
    stop: { idleMs: 500, maxMs: 5000 },
  };

  const healthResult = await Gate.run(healthGate);
  console.log(`   ${healthResult.status === "success" ? "✅ PASSED" : "❌ FAILED"}`);
  console.log("");

  // Gate 2: Test endpoint
  console.log("🧪 Gate 2: Test endpoint");
  const testGate = {
    name: "local-test",
    observe: createHttpObserveResource({ url: `${localUrl}/api/test`, pollInterval: 200 }),
    act: [Act.wait(200)],
    assert: [
      Assert.custom("test_works", async (logs) => {
        const httpLog = logs.find(l => l.stage === "http");
        if (!httpLog || httpLog.status !== "success") return false;
        const body = httpLog.data?.body as { success?: boolean };
        return body?.success === true;
      }),
    ],
    stop: { idleMs: 500, maxMs: 5000 },
  };

  const testResult = await Gate.run(testGate);
  console.log(`   ${testResult.status === "success" ? "✅ PASSED" : "❌ FAILED"}`);
  console.log("");

  // Summary
  const allPassed = healthResult.status === "success" && testResult.status === "success";

  if (allPassed) {
    console.log("✅ All gates passed! Local demo is working.");
  } else {
    console.log("❌ Some gates failed.");
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
