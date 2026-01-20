#!/usr/bin/env bun
/**
 * Framework Integrity Gate
 * 
 * Dog fooding: gateproof validates itself.
 * This gate proves the framework can test itself - the ultimate validation.
 * 
 * Usage:
 *   bun run gates/framework/integrity.gate.ts
 */

import { Gate, Act, Assert } from "../../src/index";
import { createEmptyObserveResource, runGateWithErrorHandling } from "../../src/utils";

async function main() {
  console.log("🚪 Running Framework Integrity Gate");
  console.log("   (gateproof testing itself - dog fooding)");
  console.log("");

  // Gate 1: Framework builds
  console.log("🔨 Gate 1: Framework builds");
  const buildGate = {
    name: "framework-build",
    observe: createEmptyObserveResource(),
    act: [
      Act.exec("bun run build", { cwd: process.cwd() }),
    ],
    assert: [
      Assert.custom("build_succeeds", async () => true),
    ],
    stop: { idleMs: 1000, maxMs: 60000 },
    report: "json" as const,
  };

  const buildResult = await runGateWithErrorHandling(buildGate, "build");
  console.log(`   Status: ${buildResult.status}`);
  console.log(`   Duration: ${buildResult.durationMs}ms`);
  if (buildResult.status === "failed" && buildResult.error) {
    console.log(`   Error: ${buildResult.error.message || JSON.stringify(buildResult.error)}`);
  }
  console.log("");

  // Gate 2: Framework type checks
  console.log("🔍 Gate 2: Framework type checks");
  const typecheckGate = {
    name: "framework-typecheck",
    observe: createEmptyObserveResource(),
    act: [
      Act.exec("bun run typecheck", { cwd: process.cwd() }),
    ],
    assert: [
      Assert.custom("typecheck_succeeds", async () => true),
    ],
    stop: { idleMs: 1000, maxMs: 60000 },
    report: "json" as const,
  };

  const typecheckResult = await runGateWithErrorHandling(typecheckGate, "typecheck");
  console.log(`   Status: ${typecheckResult.status}`);
  console.log(`   Duration: ${typecheckResult.durationMs}ms`);
  if (typecheckResult.status === "failed" && typecheckResult.error) {
    console.log(`   Error: ${typecheckResult.error.message || JSON.stringify(typecheckResult.error)}`);
  }
  console.log("");

  // Gate 3: Framework tests pass
  console.log("🧪 Gate 3: Framework tests pass");
  const testGate = {
    name: "framework-tests",
    observe: createEmptyObserveResource(),
    act: [
      Act.exec("bun test", { cwd: process.cwd() }),
    ],
    assert: [
      Assert.custom("tests_succeed", async () => true),
    ],
    stop: { idleMs: 1000, maxMs: 120000 },
    report: "json" as const,
  };

  const testResult = await runGateWithErrorHandling(testGate, "tests");
  console.log(`   Status: ${testResult.status}`);
  console.log(`   Duration: ${testResult.durationMs}ms`);
  if (testResult.status === "failed" && testResult.error) {
    console.log(`   Error: ${testResult.error.message || JSON.stringify(testResult.error)}`);
  }
  console.log("");

  // Summary
  console.log("📊 Gate Summary:");
  const allPassed = buildResult.status === "success" && 
                    typecheckResult.status === "success" && 
                    testResult.status === "success";
  
  console.log(`   Build: ${buildResult.status === "success" ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`   Typecheck: ${typecheckResult.status === "success" ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`   Tests: ${testResult.status === "success" ? "✅ PASSED" : "❌ FAILED"}`);
  console.log("");

  if (allPassed) {
    console.log("✅ All gates passed! Framework integrity verified.");
    console.log("   gateproof successfully tested itself.");
    process.exit(0);
  } else {
    console.log("❌ Some gates failed. Framework integrity compromised.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
