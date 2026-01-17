#!/usr/bin/env bun
/**
 * Development Gate
 * 
 * Validates that the demo homepage loads correctly in development.
 * Assumes the dev server is running (start with `bun run dev`).
 * 
 * Usage:
 *   bun run demo/gates/development.gate.ts
 * 
 * Environment variables:
 *   DEV_URL - Development server URL (defaults to http://localhost:5173)
 */

import { Gate, Act, Assert } from "../../src/index";
import { createEmptyObserveResource, runGateWithErrorHandling } from "../../src/utils";

const devUrl = process.env.DEV_URL || "http://localhost:5173";

async function main() {
  console.log(`🚪 Running Development Gate: ${devUrl}`);
  console.log("");

  // Gate 1: Homepage loads with expected content
  console.log("📄 Gate 1: Homepage loads correctly");
  const homepageGate = {
    name: "development-homepage",
    observe: createEmptyObserveResource(),
    act: [
      Act.wait(500),
    ],
    assert: [
      Assert.custom("homepage_accessible", async () => {
        const response = await fetch(devUrl);
        if (!response.ok) {
          console.error(`   HTTP ${response.status}: ${response.statusText}`);
          const text = await response.text().catch(() => "");
          if (text) console.error(`   Response: ${text.substring(0, 200)}`);
          return false;
        }
        const html = await response.text();
        const hasTitle = html.includes("gateproof");
        const hasSubtitle = html.includes("The observation layer for building software in reverse");
        if (!hasTitle || !hasSubtitle) {
          console.error(`   Missing expected content. Has title: ${hasTitle}, Has subtitle: ${hasSubtitle}`);
        }
        return hasTitle && hasSubtitle;
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
