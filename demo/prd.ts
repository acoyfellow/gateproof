#!/usr/bin/env bun
/**
 * gateproof PRD — Sandbox baseline investigation
 *
 * Story: Identify why our sandbox deployment times out by comparing
 * against Cloudflare's official minimal example and systematically
 * testing each configuration difference.
 *
 * Investigation plan:
 * 1. Deploy official Cloudflare minimal sandbox example (baseline)
 * 2. Test baseline works
 * 3. Incrementally modify toward our config, testing at each step:
 *    a. Change instance_type: lite → standard-3
 *    b. Change max_instances: 1 → 2
 *    c. Change sandbox ID: static → dynamic UUID
 *    d. Add SvelteKit instead of plain Worker
 *    e. Add Alchemy instead of wrangler.jsonc
 *
 * Key differences discovered:
 * - Official: instance_type="lite", max_instances=1, static sandbox ID
 * - Ours: instanceType="standard-3", maxInstances=2, random UUID per request
 * - Ours has extra DurableObjectNamespace declaration that may conflict
 *
 * Run with `bun run prd.ts` from demo/ directory.
 */

import { definePrd, runPrd } from "../src/prd/index";

export const prd = definePrd({
  stories: [
    {
      id: "sandbox-baseline",
      title: "Deploy official minimal sandbox example — evidence: /run returns {output:'4\\n',success:true}",
      gateFile: "../gates/production/sandbox-baseline.gate.ts",
      scope: {
        allowedPaths: ["sandbox-baseline/**", "gates/production/sandbox-baseline.gate.ts", "prd.ts"],
        maxChangedFiles: 10,
        maxChangedLines: 300,
      },
    },
    {
      id: "sandbox-instance-type",
      title: "Change instance_type='standard-3' instead of 'lite' — evidence: /run still works",
      gateFile: "../gates/production/sandbox-instance-type.gate.ts",
      dependsOn: ["sandbox-baseline"],
      scope: {
        allowedPaths: ["sandbox-baseline/**", "gates/production/sandbox-instance-type.gate.ts"],
        maxChangedFiles: 3,
        maxChangedLines: 50,
      },
    },
    {
      id: "sandbox-dynamic-id",
      title: "Change to dynamic sandbox ID (crypto.randomUUID) — evidence: still works",
      gateFile: "../gates/production/sandbox-dynamic-id.gate.ts",
      dependsOn: ["sandbox-instance-type"],
      scope: {
        allowedPaths: ["sandbox-baseline/**", "gates/production/sandbox-dynamic-id.gate.ts"],
        maxChangedFiles: 3,
        maxChangedLines: 50,
      },
    },
    {
      id: "sandbox-alchemy-config",
      title: "Replace wrangler.jsonc with Alchemy config — evidence: alchemy deploy works",
      gateFile: "../gates/production/sandbox-alchemy-config.gate.ts",
      dependsOn: ["sandbox-dynamic-id"],
      scope: {
        allowedPaths: ["sandbox-baseline/**", "gates/production/sandbox-alchemy-config.gate.ts"],
        maxChangedFiles: 5,
        maxChangedLines: 150,
      },
    },
    {
      id: "sandbox-do-namespace",
      title: "Remove extra DurableObjectNamespace declaration — evidence: gateproof.dev/api/prd/run works",
      gateFile: "../gates/production/sandbox-do-namespace.gate.ts",
      scope: {
        allowedPaths: ["alchemy.run.ts", "src/routes/api/prd/run/**", "gates/production/sandbox-do-namespace.gate.ts"],
        maxChangedFiles: 4,
        maxChangedLines: 100,
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
