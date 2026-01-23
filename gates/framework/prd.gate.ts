#!/usr/bin/env bun
/**
 * PRD Runner Gate
 * 
 * Dog fooding: gateproof validates its own PRD runner.
 * This gate proves the PRD runner works by running the repo's prd.ts.
 * 
 * Usage:
 *   bun run gates/framework/prd.gate.ts
 */

import { Gate, Act, Assert } from "../../src/index";
import { createEmptyObserveResource, runGateWithErrorHandling } from "../../src/utils";

async function main() {
  console.log("🚪 Running PRD Runner Gate");
  console.log("   (gateproof testing its PRD runner - dog fooding)");
  console.log("");

  // Gate: PRD runner executes successfully
  console.log("📋 Gate: PRD runner executes successfully");
  const prdGate = {
    name: "prd-runner",
    observe: createEmptyObserveResource(),
    act: [
      Act.exec("bun run prd.ts", { cwd: process.cwd() }),
    ],
    assert: [
      Assert.custom("prd_succeeds", async () => true),
    ],
    stop: { idleMs: 1000, maxMs: 120000 },
    report: "json" as const,
  };

  const prdResult = await runGateWithErrorHandling(prdGate, "prd");
  console.log(`   Status: ${prdResult.status}`);
  console.log(`   Duration: ${prdResult.durationMs}ms`);
  if (prdResult.status === "failed" && prdResult.error) {
    console.log(`   Error: ${prdResult.error.message || JSON.stringify(prdResult.error)}`);
  }
  console.log("");

  // Summary
  console.log("📊 Gate Summary:");
  console.log(`   PRD Runner: ${prdResult.status === "success" ? "✅ PASSED" : "❌ FAILED"}`);
  console.log("");

  if (prdResult.status === "success") {
    console.log("✅ PRD runner gate passed! PRD runner is working.");
    process.exit(0);
  } else {
    console.log("❌ PRD runner gate failed.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
