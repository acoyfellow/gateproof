#!/usr/bin/env bun
/**
 * Local Sandbox Gate
 *
 * Validates that the demo sandbox execution works in local dev.
 *
 * Usage:
 *   bun run gates/local/sandbox-dev.gate.ts
 *
 * Environment variables:
 *   LOCAL_URL - Local dev URL (defaults to http://localhost:5173)
 */

import { Gate, Act, Assert, createHttpObserveResource } from "../../src/index";

const localUrl = process.env.LOCAL_URL || "http://localhost:5173";

const prdFile = `console.log("sandbox ok");\nprocess.exit(0);\n`;

export async function run() {
  // Skip in CI — this gate requires a local dev server
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    console.log("⏭️  Skipping local sandbox gate (CI environment)");
    return { status: "success" as const };
  }

  console.log(`🚪 Running Local Sandbox Gate: ${localUrl}`);
  console.log("");

  const sandboxGate = {
    name: "local-sandbox-run",
    observe: createHttpObserveResource({
      url: `${localUrl}/api/prd/run`,
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
      Assert.custom("sandbox_run_completes", async (logs) => {
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
    console.log("✅ Sandbox execution gate passed.");
  } else {
    console.log("❌ Sandbox execution gate failed.");
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
