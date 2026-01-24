#!/usr/bin/env bun
/**
 * gateproof PRD
 * 
 * This is the steering wheel for the gateproof repository.
 * Run with: bun run prd.ts
 * 
 * Each story references a gate file that exports a `run()` function.
 * Gates execute in dependency order and stop on first failure.
 */

import { definePrd, runPrd } from "./src/prd/index";

export const prd = definePrd({
  stories: [
    {
      id: "framework-build",
      title: "Framework builds",
      gateFile: "./gates/prd/framework-build.gate.ts",
    },
    {
      id: "framework-tests",
      title: "Framework tests pass",
      gateFile: "./gates/prd/framework-tests.gate.ts",
      dependsOn: ["framework-build"],
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
      console.error(`\n❌ PRD failed at: ${result.failedStory.id} - ${result.failedStory.title}`);
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
