#!/usr/bin/env bun
/**
 * HTTP Validation Pattern
 * 
 * Validates HTTP endpoints without requiring log observation.
 * Useful for smoke tests and basic health checks.
 * 
 * This pattern uses an empty backend since we're validating HTTP responses,
 * not observing logs from a worker.
 */

import { Gate, Act, Assert } from "../../src/index";
import { createEmptyObserveResource } from "../../src/utils";

const url = process.env.TEST_URL || "https://example.com";

const gate = {
  name: "http-validation",
  observe: createEmptyObserveResource(),
  act: [Act.wait(500)],
  assert: [
    Assert.custom("endpoint_accessible", async () => {
      const response = await fetch(url);
      return response.ok;
    }),
    Assert.custom("has_expected_content", async () => {
      const response = await fetch(url);
      const text = await response.text();
      // Customize this assertion for your needs
      return text.length > 0;
    })
  ],
  stop: { idleMs: 1000, maxMs: 10000 }
};

Gate.run(gate)
  .then((result) => {
    if (result.status !== "success") {
      console.error(`❌ Validation failed: ${result.error?.message || "unknown error"}`);
      process.exit(1);
    }
    console.log("✅ HTTP validation passed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
