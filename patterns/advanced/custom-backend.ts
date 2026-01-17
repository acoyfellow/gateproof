#!/usr/bin/env bun
/**
 * Custom Backend Pattern
 * 
 * Shows how to create a custom backend for gateproof.
 * This allows you to plug in any observability system.
 * 
 * The backend interface is simple: just implement start() and stop()
 */

import { Gate, Act, Assert } from "../../src/index";
import { createObserveResource, type Backend } from "../../src/observe";
import { Effect } from "effect";

// Example: Custom backend that reads from a file
function createFileBackend(filePath: string): Backend {
  return {
    start: () => Effect.gen(function* () {
      // In a real implementation, you'd read from the file
      // and yield logs as they appear
      return {
        async *[Symbol.asyncIterator]() {
          // Simulated log stream
          yield {
            timestamp: new Date().toISOString(),
            stage: "custom",
            action: "file_read",
            status: "success"
          };
        }
      };
    }),
    stop: () => Effect.void
  };
}

// Example: Custom backend that polls an API
function createApiBackend(apiUrl: string): Backend {
  return {
    start: () => Effect.gen(function* () {
      return {
        async *[Symbol.asyncIterator]() {
          while (true) {
            const response = await fetch(apiUrl);
            const logs = await response.json();
            for (const log of logs) {
              yield log;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      };
    }),
    stop: () => Effect.void
  };
}

// Use the custom backend
const gate = {
  name: "custom-backend-example",
  observe: createObserveResource(createFileBackend("/path/to/logs.json")),
  act: [Act.wait(500)],
  assert: [
    Assert.hasAction("file_read")
  ],
  stop: { idleMs: 1000, maxMs: 5000 }
};

Gate.run(gate)
  .then((result) => {
    if (result.status !== "success") {
      console.error(`❌ Gate failed: ${result.error?.message || "unknown error"}`);
      process.exit(1);
    }
    console.log("✅ Gate passed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
