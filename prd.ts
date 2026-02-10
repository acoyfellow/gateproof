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
    {
      id: "agent-first-pattern",
      title: "Agent-first spec interview pattern is documented and linked",
      gateFile: "./gates/prd/agent-first-pattern.gate.ts",
      dependsOn: ["framework-tests"],
      scope: {
        allowedPaths: [
          "prd.ts",
          "gates/prd/agent-first-pattern.gate.ts",
          "patterns/agent-first/**",
          "README.md",
          "AGENTS.md",
          "demo/src/lib/components/PatternsSection.svelte",
        ],
        maxChangedFiles: 6,
        maxChangedLines: 300,
      },
    },
    {
      id: "demo-sandbox-run",
      title: "Demo sandbox run endpoint works in local dev",
      gateFile: "./gates/local/sandbox-dev.gate.ts",
      dependsOn: ["framework-tests"],
    },
    {
      id: "framework-integrity",
      title: "Framework integrity gate (build/typecheck/test) passes",
      gateFile: "./gates/framework/integrity.gate.ts",
      dependsOn: ["framework-tests"],
    },
    {
      id: "demo-dev-homepage",
      title: "Demo homepage loads in local dev",
      gateFile: "./gates/demo/development.gate.ts",
      dependsOn: ["framework-tests"],
    },
    {
      id: "demo-prd-generate",
      title: "Demo PRD generation endpoint works in local dev",
      gateFile: "./gates/demo/prd-generate.gate.ts",
      dependsOn: ["demo-dev-homepage"],
    },
    {
      id: "local-demo-worker",
      title: "Local demo worker endpoints respond",
      gateFile: "./gates/local/demo.gate.ts",
      dependsOn: ["framework-tests"],
    },
    {
      id: "production-smoke",
      title: "Production smoke check passes",
      gateFile: "./gates/production/smoke.gate.ts",
      dependsOn: ["framework-tests"],
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
