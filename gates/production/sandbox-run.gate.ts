#!/usr/bin/env bun
/**
 * Production Sandbox Run Gate
 *
 * Validates that the production sandbox run endpoint accepts a prd.ts
 * and returns a complete SSE stream.
 *
 * Usage:
 *   bun run gates/production/sandbox-run.gate.ts
 *
 * Environment variables:
 *   PRODUCTION_URL - Production URL (defaults to https://gateproof.dev)
 */

import { Gate, Act, Assert, createHttpObserveResource } from "../../src/index";

const productionUrl = process.env.PRODUCTION_URL || "https://gateproof.dev";

const prdFile = `console.log("sandbox ok");\nprocess.exit(0);\n`;

export async function run() {
  console.log(`🚪 Running Production Sandbox Gate: ${productionUrl}`);
  console.log("");

  const sandboxGate = {
    name: "production-sandbox-run",
    observe: createHttpObserveResource({
      url: `${productionUrl}/api/prd/run`,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prdFile,
        apiUrl: "https://example.test",
        testUrl: "http://localhost:3000",
      }),
      pollInterval: 2000,
      timeoutMs: 20000,
    }),
    act: [Act.wait(200)],
    assert: [
      Assert.custom("sandbox_run_sse_completes", async (logs) => {
        const httpLog = logs.find((log) => log.stage === "http");
        if (!httpLog || httpLog.status !== "success") return false;
        const body = httpLog.data?.body;
        if (typeof body !== "string") return false;
        return body.includes("event: complete") && body.includes("\"exitCode\":0");
      }),
    ],
    stop: { idleMs: 1000, maxMs: 25000 },
  };

  const result = await Gate.run(sandboxGate);
  console.log(`   ${result.status === "success" ? "✅ PASSED" : "❌ FAILED"}`);
  console.log("");

  if (result.status === "success") {
    console.log("✅ Production sandbox run gate passed.");
  } else {
    console.log("❌ Production sandbox run gate failed.");
  }

  return { status: result.status };
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
