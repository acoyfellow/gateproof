#!/usr/bin/env bun
/**
 * Sandbox Timeout Repro Gate
 *
 * Hits the minimal sandbox-timeout-repro worker and captures timing data.
 * Demonstrates the container provisioning timeout bug by asserting on the
 * structured JSON response from the repro worker.
 *
 * Usage:
 *   bun run gates/production/sandbox-timeout-repro.gate.ts
 *
 * Environment variables:
 *   REPRO_URL - Deployed repro worker URL (defaults to https://sandbox-timeout-repro.<subdomain>.workers.dev)
 */

import { Gate, Act, Assert, createHttpObserveResource } from "../../src/index";

const reproUrl =
  process.env.REPRO_URL || "https://sandbox-timeout-repro.coy.workers.dev";

interface StepResult {
  ok: boolean;
  ms: number;
  error?: string;
}

interface PollAttempt {
  attempt: number;
  ms: number;
  ok: boolean;
  error?: string;
}

interface ListFilesResult {
  ready: boolean;
  totalMs: number;
  attempts: PollAttempt[];
}

interface ReproResponse {
  getSandbox?: StepResult;
  listFiles?: ListFilesResult;
  mkdir?: StepResult;
  totalMs?: number;
}

export async function run() {
  console.log(`Running Sandbox Timeout Repro Gate: ${reproUrl}`);
  console.log("");

  // Gate 1: Worker reachability — does the repro worker respond at all?
  console.log("Gate 1: Worker reachability");
  const reachabilityGate = {
    name: "sandbox-repro-reachable",
    observe: createHttpObserveResource({
      url: reproUrl,
      pollInterval: 3000,
      timeoutMs: 200_000,
    }),
    act: [Act.wait(500)],
    assert: [
      Assert.custom("worker_responds", async (logs) => {
        const httpLog = logs.find((l) => l.stage === "http");
        return httpLog?.status === "success" || httpLog?.status === "error";
      }),
    ],
    stop: { idleMs: 5000, maxMs: 210_000 },
  };

  const reachResult = await Gate.run(reachabilityGate);
  console.log(
    `   ${reachResult.status === "success" ? "PASSED" : "FAILED"} (${reachResult.durationMs}ms)`,
  );
  console.log("");

  // Gate 2: Timing analysis — parse the JSON response and report on each step
  console.log("Gate 2: Sandbox provisioning timing analysis");
  const timingGate = {
    name: "sandbox-repro-timing",
    observe: createHttpObserveResource({
      url: reproUrl,
      pollInterval: 3000,
      timeoutMs: 200_000,
    }),
    act: [Act.wait(500)],
    assert: [
      Assert.custom("timing_captured", async (logs) => {
        const httpLog = logs.find((l) => l.stage === "http");
        if (!httpLog) return false;

        const body = httpLog.data?.body as ReproResponse | undefined;
        if (!body) return false;

        // Print the raw timing data as evidence
        console.log("   --- Timing Evidence ---");
        if (body.getSandbox) {
          console.log(
            `   getSandbox: ${body.getSandbox.ok ? "OK" : "FAILED"} (${body.getSandbox.ms}ms)${body.getSandbox.error ? ` — ${body.getSandbox.error}` : ""}`,
          );
        }
        if (body.listFiles) {
          console.log(
            `   listFiles:  ${body.listFiles.ready ? "READY" : "NOT READY"} (${body.listFiles.totalMs}ms, ${body.listFiles.attempts.length} attempts)`,
          );
          for (const a of body.listFiles.attempts) {
            console.log(
              `     attempt ${a.attempt}: ${a.ok ? "OK" : "FAILED"} (${a.ms}ms)${a.error ? ` — ${a.error}` : ""}`,
            );
          }
        }
        if (body.mkdir) {
          console.log(
            `   mkdir:      ${body.mkdir.ok ? "OK" : "FAILED"} (${body.mkdir.ms}ms)${body.mkdir.error ? ` — ${body.mkdir.error}` : ""}`,
          );
        }
        if (body.totalMs != null) {
          console.log(`   total:      ${body.totalMs}ms`);
        }
        console.log("   --- End Evidence ---");

        // The gate "passes" if we got timing data — the bug is demonstrated
        // by the specific values (timeouts, 500s) in the evidence above.
        return true;
      }),

      // This assertion checks for the bug: any step failed or total > 30s
      Assert.custom("bug_detected", async (logs) => {
        const httpLog = logs.find((l) => l.stage === "http");
        if (!httpLog) return false;

        const statusCode = httpLog.data?.statusCode as number | undefined;
        const body = httpLog.data?.body as ReproResponse | undefined;
        if (!body) return false;

        const getSandboxFailed = body.getSandbox && !body.getSandbox.ok;
        const listFilesFailed = body.listFiles && !body.listFiles.ready;
        const mkdirFailed = body.mkdir && !body.mkdir.ok;
        const http500 = statusCode === 500;
        const totalSlow = (body.totalMs ?? 0) > 30_000;

        const bugPresent =
          getSandboxFailed ||
          listFilesFailed ||
          mkdirFailed ||
          http500 ||
          totalSlow;

        if (bugPresent) {
          console.log("   BUG CONFIRMED: sandbox provisioning timeout/error detected");
        } else {
          console.log(
            "   Bug not observed this run (may depend on Cloudflare DO health)",
          );
        }

        // Pass either way — this is a diagnostic gate, not a correctness gate.
        // The evidence output above is what matters for the bug report.
        return true;
      }),
    ],
    stop: { idleMs: 5000, maxMs: 210_000 },
  };

  const timingResult = await Gate.run(timingGate);
  console.log(
    `   ${timingResult.status === "success" ? "PASSED" : "FAILED"} (${timingResult.durationMs}ms)`,
  );
  console.log("");

  const allPassed =
    reachResult.status === "success" && timingResult.status === "success";

  if (allPassed) {
    console.log("Sandbox timeout repro gate completed — see timing evidence above.");
  } else {
    console.log("Sandbox timeout repro gate failed — worker may not be deployed.");
  }

  return { status: allPassed ? ("success" as const) : ("failed" as const) };
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
