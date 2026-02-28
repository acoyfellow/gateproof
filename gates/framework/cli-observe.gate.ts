#!/usr/bin/env bun
/**
 * CLI Observe Gate
 *
 * Proves that createCliObserveResource captures stdout/stderr from Act.exec
 * calls and surfaces them as Log[] for the assert phase.
 *
 * Usage:
 *   bun run gates/framework/cli-observe.gate.ts
 */

import { Gate, Act, Assert } from "../../src/index";
import { createCliObserveResource } from "../../src/cli-observe";

export async function run() {
  console.log("Running CLI Observe Gate");
  console.log("");

  // Gate 1: stdout capture — echo produces output that appears in logs
  console.log("Gate 1: stdout is captured");
  const stdoutResult = await Gate.run({
    name: "cli-observe-stdout",
    observe: createCliObserveResource(),
    act: [Act.exec("echo gateproof_cli_test_marker")],
    assert: [
      Assert.noErrors(),
      Assert.custom("stdout-captured", (logs) =>
        logs.some((l) => l.message?.includes("gateproof_cli_test_marker"))
      ),
      Assert.custom("has-cli-stage", (logs) =>
        logs.some((l) => l.stage === "cli")
      ),
    ],
    stop: { idleMs: 1000, maxMs: 10000 },
  });
  console.log(`  Status: ${stdoutResult.status}`);
  console.log(`  Logs collected: ${stdoutResult.logs.length}`);
  if (stdoutResult.status !== "success") {
    console.log(`  Error: ${stdoutResult.error?.message}`);
    console.log(`  Logs: ${JSON.stringify(stdoutResult.logs, null, 2)}`);
  }
  console.log("");

  // Gate 2: observer isolation — separate gate runs don't leak logs between them
  console.log("Gate 2: observer isolation between gate runs");
  const isolationResult = await Gate.run({
    name: "cli-observe-isolation",
    observe: createCliObserveResource(),
    act: [Act.exec("echo isolation_marker_unique")],
    assert: [
      Assert.noErrors(),
      Assert.custom("no-leakage", (logs) =>
        !logs.some((l) => l.message?.includes("gateproof_cli_test_marker"))
      ),
      Assert.custom("own-output-present", (logs) =>
        logs.some((l) => l.message?.includes("isolation_marker_unique"))
      ),
    ],
    stop: { idleMs: 1000, maxMs: 10000 },
  });
  console.log(`  Status: ${isolationResult.status}`);
  console.log(`  Logs collected: ${isolationResult.logs.length}`);
  if (isolationResult.status !== "success") {
    console.log(`  Error: ${isolationResult.error?.message}`);
    console.log(`  Logs: ${JSON.stringify(isolationResult.logs, null, 2)}`);
  }
  console.log("");

  // Gate 3: process exit is recorded with correct status
  console.log("Gate 3: exec start/exit logs are recorded");
  const exitResult = await Gate.run({
    name: "cli-observe-exit",
    observe: createCliObserveResource(),
    act: [Act.exec("echo done")],
    assert: [
      Assert.noErrors(),
      Assert.custom("has-exec-start", (logs) =>
        logs.some((l) => l.action === "exec" && l.status === "start")
      ),
      Assert.custom("has-exec-success", (logs) =>
        logs.some((l) => l.action === "exec" && l.status === "success")
      ),
    ],
    stop: { idleMs: 1000, maxMs: 10000 },
  });
  console.log(`  Status: ${exitResult.status}`);
  console.log(`  Logs collected: ${exitResult.logs.length}`);
  if (exitResult.status !== "success") {
    console.log(`  Error: ${exitResult.error?.message}`);
    console.log(`  Logs: ${JSON.stringify(exitResult.logs, null, 2)}`);
  }
  console.log("");

  // Summary
  const allPassed =
    stdoutResult.status === "success" &&
    isolationResult.status === "success" &&
    exitResult.status === "success";

  console.log("Gate Summary:");
  console.log(
    `  stdout capture: ${stdoutResult.status === "success" ? "PASSED" : "FAILED"}`
  );
  console.log(
    `  observer isolation: ${isolationResult.status === "success" ? "PASSED" : "FAILED"}`
  );
  console.log(
    `  exec lifecycle: ${exitResult.status === "success" ? "PASSED" : "FAILED"}`
  );
  console.log("");

  if (allPassed) {
    console.log("All CLI observe gates passed.");
  } else {
    console.log("Some CLI observe gates failed.");
  }

  return { status: allPassed ? "success" : "failed" };
}

if (import.meta.main) {
  run()
    .then((result) => {
      process.exit(result.status === "success" ? 0 : 1);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}
