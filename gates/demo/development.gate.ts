#!/usr/bin/env bun
/**
 * Development Gate
 *
 * Validates that the demo homepage loads correctly in development.
 *
 * Usage:
 *   bun run gates/demo/development.gate.ts
 *
 * Environment variables:
 *   DEV_URL - Development server URL (defaults to http://localhost:5173)
 */

import { Gate, Act, Assert, createHttpObserveResource } from "../../src/index";
import { runGateWithErrorHandling } from "../../src/utils";

const devUrl = process.env.DEV_URL || "http://localhost:5173";

async function main() {
  console.log(`🚪 Running Development Gate: ${devUrl}`);
  console.log("");

  // Check if dev server is available
  let isAvailable = false;
  try {
    const response = await fetch(devUrl, { signal: AbortSignal.timeout(2000) });
    isAvailable = response.ok;
  } catch {
    isAvailable = false;
  }

  if (!isAvailable) {
    console.log("⚠️  Dev server not available. Skipping gates.");
    console.log("   Start the server with: cd demo && bun run dev");
    process.exit(0);
  }

  // Gate 1: Homepage loads with expected content
  console.log("📄 Gate 1: Homepage loads correctly");
  const homepageGate = {
    name: "development-homepage",
    observe: createHttpObserveResource({ url: devUrl, pollInterval: 500 }),
    act: [
      Act.wait(500),
    ],
    assert: [
      Assert.custom("homepage_accessible", async (logs) => {
        const httpLog = logs.find(l => l.stage === "http");
        if (!httpLog) return false;
        if (httpLog.status !== "success") return false;
        const body = httpLog.data?.body as string;
        if (!body) return false;
        return body.includes("gateproof") &&
               body.includes("The observation layer for building software in reverse");
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

  // Summary
  console.log("📊 Gate Summary:");
  console.log(`   Homepage: ${homepageResult.status === "success" ? "✅ PASSED" : "❌ FAILED"}`);
  console.log("");

  if (homepageResult.status === "success") {
    console.log("✅ Development gate passed! Homepage is working.");
    process.exit(0);
  } else {
    console.log("❌ Development gate failed.");
    console.log(`💡 Make sure the dev server is running: cd demo && bun run dev`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
