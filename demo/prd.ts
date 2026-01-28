#!/usr/bin/env bun
/**
 * gateproof PRD — Sandbox stabilization
 *
 * Story: stabilize sandbox orchestration after container provisioning failures.
 * Run with `bun run prd.ts` from this repo root. Use `--report`/`--check-scope`
 * to capture evidence or scope-diff checks.
 */

import { definePrd, runPrd } from "../src/prd/index";

export const prd = definePrd({
  stories: [
    {
      id: "sandbox-stability",
      title:
        "Sandbox diagnostic endpoints succeed — evidence: diagnose mkdir success — scope: src/routes/api/prd/run/** + docs/sandbox-troubleshooting.md",
      gateFile: "../gates/production/sandbox-diagnose.gate.ts",
      description:
        "Prevent `/api/prd/run/diagnose` and `/api/prd/run` from failing with `SandboxError: HTTP error! status: 500` by ensuring the Cloudflare Sandbox binding can finish provisioning before we call `mkdir`, start the PRD process, or stream logs. Evidence includes successful diagnose responses and the new troubleshooting notes (`docs/sandbox-troubleshooting.md`) that capture the investigation and retry logic.",
      scope: {
        allowedPaths: [
          "src/routes/api/prd/run/**",
          "src/lib/sandbox.ts",
          "docs/sandbox-troubleshooting.md",
          "alchemy.run.ts",
          "prd.ts",
        ],
        maxChangedFiles: 6,
        maxChangedLines: 500,
      },
    },
  ],
});

if (import.meta.main) {
  const args = process.argv.slice(2);
  let reportPath: string | undefined;
  let checkScope = false;
  let baseRef: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--report" && i + 1 < args.length) {
      reportPath = args[i + 1];
      i++;
    } else if (args[i] === "--check-scope") {
      checkScope = true;
    } else if (args[i] === "--base-ref" && i + 1 < args.length) {
      baseRef = args[i + 1];
      i++;
    }
  }

  const result = await runPrd(prd, process.cwd(), {
    reportPath,
    checkScope,
    baseRef,
  });

  if (!result.success) {
    if (result.failedStory) {
      console.error(
        `\n❌ PRD failed at: ${result.failedStory.id} - ${result.failedStory.title}`,
      );
    }
    if (result.error) console.error(`Error: ${result.error.message}`);
    process.exit(1);
  }
  console.log("\n✅ All PRD stories passed!");
  if (reportPath) {
    console.log(`📊 Report written to: ${reportPath}`);
  }
  process.exit(0);
}
