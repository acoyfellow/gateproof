#!/usr/bin/env bun
/**
 * PRD Generation Gate
 *
 * Validates that the PRD generation endpoint works correctly.
 *
 * Usage:
 *   bun run gates/demo/prd-generate.gate.ts
 *
 * Environment variables:
 *   DEV_URL - Development server URL (defaults to http://localhost:5173)
 */

import { Gate, Act, Assert, createEmptyObserveResource } from "../../src/index";
import { runGateWithErrorHandling } from "../../src/utils";

const devUrl = process.env.DEV_URL || "http://localhost:5173";
const prdEndpoint = `${devUrl}/api/prd/generate`;

export async function run() {
  // Skip in CI — this gate requires a local dev server
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    console.log("⏭️  Skipping PRD generation gate (CI environment)");
    return { status: "success" as const };
  }

  console.log(`🚪 Running PRD Generation Gate: ${prdEndpoint}`);
  console.log("");

  // Gate 1: PRD generation endpoint accepts valid input
  console.log("📝 Gate 1: PRD generation with valid input");
  const prdGate = {
    name: "prd-generate-valid",
    observe: createEmptyObserveResource(),
    act: [Act.wait(500)],
    assert: [
      Assert.custom("prd_generation_works", async () => {
        const response = await fetch(prdEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            descriptions: "User can sign up with email and password",
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: "Unknown error" }));
          console.error(`   Response error: ${JSON.stringify(error)}`);
          return false;
        }

        const data = await response.json().catch(() => null);
        if (!data) {
          console.error("   Failed to parse response as JSON");
          return false;
        }

        // Check for error response
        if (data.error) {
          console.error(`   API returned error: ${data.error} - ${data.message}`);
          return false;
        }

        // Check for success response with prdFile
        if (!data.prdFile || typeof data.prdFile !== "string") {
          console.error(`   Missing prdFile in response: ${JSON.stringify(data)}`);
          return false;
        }

        // Validate PRD structure (single-file format with inline gates)
        const prdContent = data.prdFile;
        const hasStories = prdContent.includes("stories") || prdContent.includes("const stories");
        const hasGates = prdContent.includes("function") && prdContent.includes("Gate");
        const hasRunPrd = prdContent.includes("runPrd") || prdContent.includes("Gate.run");
        const hasConfig = prdContent.includes("API_URL") || prdContent.includes("CONFIGURATION");

        if (!hasStories || !hasGates || !hasRunPrd) {
          console.error(`   Invalid PRD structure. Has stories: ${hasStories}, has gates: ${hasGates}, has runner: ${hasRunPrd}`);
          return false;
        }

        return true;
      }),
    ],
    stop: { idleMs: 1000, maxMs: 30000 },
    report: "json" as const,
  };

  const prdResult = await runGateWithErrorHandling(prdGate, "prd-generate");
  console.log(`   Status: ${prdResult.status}`);
  console.log(`   Duration: ${prdResult.durationMs}ms`);
  if (prdResult.status === "failed" && prdResult.error) {
    console.log(`   Error: ${prdResult.error.message || JSON.stringify(prdResult.error)}`);
  }
  console.log("");

  // Gate 2: PRD generation endpoint handles missing input
  console.log("📝 Gate 2: PRD generation with missing input (should error)");
  const errorGate = {
    name: "prd-generate-error",
    observe: createEmptyObserveResource(),
    act: [Act.wait(500)],
    assert: [
      Assert.custom("prd_generation_handles_error", async () => {
        const response = await fetch(prdEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            descriptions: "",
          }),
        });

        // Should return 400 for missing/empty descriptions
        if (response.status !== 400) {
          console.error(`   Expected 400, got ${response.status}`);
          return false;
        }

        const data = await response.json().catch(() => null);
        if (!data || !data.error) {
          console.error(`   Expected error response, got: ${JSON.stringify(data)}`);
          return false;
        }

        return true;
      }),
    ],
    stop: { idleMs: 1000, maxMs: 10000 },
    report: "json" as const,
  };

  const errorResult = await runGateWithErrorHandling(errorGate, "prd-generate-error");
  console.log(`   Status: ${errorResult.status}`);
  console.log(`   Duration: ${errorResult.durationMs}ms`);
  if (errorResult.status === "failed" && errorResult.error) {
    console.log(`   Error: ${errorResult.error.message || JSON.stringify(errorResult.error)}`);
  }
  console.log("");

  // Summary
  console.log("📊 Gate Summary:");
  console.log(`   Valid input: ${prdResult.status === "success" ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`   Error handling: ${errorResult.status === "success" ? "✅ PASSED" : "❌ FAILED"}`);
  console.log("");

  if (prdResult.status === "success" && errorResult.status === "success") {
    console.log("✅ PRD generation gate passed!");
  } else {
    console.log("❌ PRD generation gate failed.");
    console.log(`💡 Make sure the dev server is running: cd demo && bun run dev`);
    console.log(`💡 Make sure OPENCODE_ZEN_API_KEY is set in .env`);
  }

  return {
    status: prdResult.status === "success" && errorResult.status === "success" ? "success" : "failed",
  };
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
