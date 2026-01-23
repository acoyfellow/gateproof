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
  const result = await runPrd(prd);
  if (!result.success) {
    if (result.failedStory) {
      console.error(`\n❌ PRD failed at: ${result.failedStory.id} - ${result.failedStory.title}`);
    }
    if (result.error) console.error(`Error: ${result.error.message}`);
    process.exit(1);
  }
  console.log("\n✅ All PRD stories passed!");
  process.exit(0);
}
