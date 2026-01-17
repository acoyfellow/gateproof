#!/usr/bin/env bun
/**
 * Multiple Gates Pattern
 * 
 * Shows how to run multiple gates in sequence.
 * Useful for comprehensive validation.
 */

import { Gate, Act, Assert } from "../../src/index";
import { createEmptyObserveResource } from "../../src/utils";

async function runGates() {
  const gates = [
    {
      name: "health-check",
      observe: createEmptyObserveResource(),
      act: [Act.wait(200)],
      assert: [
        Assert.custom("health_ok", async () => {
          const response = await fetch("https://example.com/health");
          return response.ok;
        })
      ],
      stop: { idleMs: 500, maxMs: 5000 }
    },
    {
      name: "api-check",
      observe: createEmptyObserveResource(),
      act: [Act.wait(200)],
      assert: [
        Assert.custom("api_ok", async () => {
          const response = await fetch("https://example.com/api");
          return response.ok;
        })
      ],
      stop: { idleMs: 500, maxMs: 5000 }
    }
  ];

  const results = [];
  for (const gate of gates) {
    const result = await Gate.run(gate);
    results.push({ name: gate.name, result });
    console.log(`${gate.name}: ${result.status}`);
  }

  const allPassed = results.every(r => r.result.status === "success");
  if (!allPassed) {
    console.error("❌ Some gates failed");
    process.exit(1);
  }
  console.log("✅ All gates passed");
  process.exit(0);
}

runGates().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
