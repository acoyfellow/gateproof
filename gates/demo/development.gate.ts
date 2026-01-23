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
        // Check that <title> tag contains "gateproof" (case-insensitive)
        const titleMatch = body.match(/<title[^>]*>([^<]*)<\/title>/i);
        if (!titleMatch) return false;
        return titleMatch[1].toLowerCase().includes("gateproof");
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
