#!/usr/bin/env bun
/**
 * Production Sandbox Diagnose Gate
 *
 * Validates the sandbox backend independently of PRD execution.
 *
 * Usage:
 *   bun run gates/production/sandbox-diagnose.gate.ts
 *
 * Environment variables:
 *   PRODUCTION_URL - Production URL (defaults to https://gateproof.dev)
 */

import { Gate, Act, Assert, createHttpObserveResource } from "../../src/index";

const productionUrl = process.env.PRODUCTION_URL || "https://gateproof.dev";

export async function run() {
  console.log(`🚪 Running Production Sandbox Diagnose Gate: ${productionUrl}`);
  console.log("");

  const diagnoseGate = {
    name: "production-sandbox-diagnose",
    observe: createHttpObserveResource({
      url: `${productionUrl}/api/prd/run/diagnose`,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
      pollInterval: 2000,
      timeoutMs: 20000,
    }),
    act: [Act.wait(200)],
    assert: [
      Assert.custom("sandbox_diagnose_ok", async (logs) => {
        const httpLog = logs.find((log) => log.stage === "http");
        if (!httpLog || httpLog.status !== "success") return false;
        const body = httpLog.data?.body as { ok?: boolean; step?: string } | undefined;
        return body?.ok === true && body?.step === "complete";
      }),
    ],
    stop: { idleMs: 1000, maxMs: 25000 },
  };

  const result = await Gate.run(diagnoseGate);
  console.log(`   ${result.status === "success" ? "✅ PASSED" : "❌ FAILED"}`);
  console.log("");

  if (result.status === "success") {
    console.log("✅ Production sandbox diagnose gate passed.");
  } else {
    console.log("❌ Production sandbox diagnose gate failed.");
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
