#!/usr/bin/env bun
/**
 * Complex Gate Example
 * 
 * Demonstrates:
 * - Multiple actions (browser, exec, wait)
 * - HTTP observation backend
 * - Custom assertions with complex logic
 * - Multiple assertion types
 * - Custom timeout configuration
 * - Error handling and evidence inspection
 */

import { Gate, Act, Assert, createHttpObserveResource } from "../../src/index";

const apiUrl = process.env.API_URL || "http://localhost:8787";
const testEndpoint = `${apiUrl}/api/test`;

const gate = {
  name: "complex-integration-gate",
  
  // Observe HTTP endpoint responses
  observe: createHttpObserveResource({
    url: testEndpoint,
    pollInterval: 200,
    timeoutMs: 3000,
  }),
  
  // Multiple sequential actions
  act: [
    // Wait for service to be ready
    Act.wait(500),
    
    // Execute a shell command to check service health
    Act.exec("curl -f http://localhost:8787/api/health || echo 'health-check-failed'", {
      timeoutMs: 2000,
    }),
    
    // Open browser and interact
    Act.browser({
      url: apiUrl,
      headless: true,
      waitMs: 3000,
    }),
    
    // Final wait for logs to propagate
    Act.wait(1000),
  ],
  
  // Multiple assertions with custom logic
  assert: [
    // Basic: no errors in logs
    Assert.noErrors(),
    
    // Check specific action was logged
    Assert.hasAction("GET /api/test"),
    
    // Check specific stage appeared
    Assert.hasStage("http"),
    
    // Custom: verify response structure
    Assert.custom("valid_json_response", (logs) => {
      const httpLog = logs.find(l => l.stage === "http" && l.status === "success");
      if (!httpLog) return false;
      
      const body = httpLog.data?.body;
      if (!body || typeof body !== "object") return false;
      
      // Verify expected fields exist
      const hasSuccess = "success" in body;
      const hasRequestId = "requestId" in body;
      const hasDuration = "durationMs" in body;
      
      return hasSuccess && hasRequestId && hasDuration;
    }),
    
    // Custom: verify performance (response time < 1s)
    Assert.custom("fast_response", (logs) => {
      const httpLog = logs.find(l => l.stage === "http" && l.status === "success");
      if (!httpLog) return false;
      
      const durationMs = httpLog.durationMs;
      return typeof durationMs === "number" && durationMs < 1000;
    }),
    
    // Custom: verify multiple requests were made
    Assert.custom("multiple_requests", (logs) => {
      const httpLogs = logs.filter(l => l.stage === "http");
      return httpLogs.length >= 2;
    }),
    
    // Custom: verify request IDs are unique
    Assert.custom("unique_request_ids", (logs) => {
      const requestIds = logs
        .map(l => l.requestId)
        .filter((id): id is string => typeof id === "string");
      
      const uniqueIds = new Set(requestIds);
      return requestIds.length === uniqueIds.size;
    }),
  ],
  
  // Custom timeout: wait up to 15s, but return early if idle > 2s
  stop: { idleMs: 2000, maxMs: 15000 },
  
  // Limit log collection
  maxLogs: 1000,
  
  // Pretty print results
  report: "pretty" as const,
};

Gate.run(gate)
  .then((result) => {
    if (result.status === "success") {
      console.log("\n✅ Gate passed!");
      console.log(`Duration: ${result.durationMs}ms`);
      console.log(`Logs collected: ${result.logs.length}`);
      console.log(`Actions seen: ${result.evidence.actionsSeen.join(", ")}`);
      console.log(`Stages seen: ${result.evidence.stagesSeen.join(", ")}`);
      console.log(`Request IDs: ${result.evidence.requestIds.length}`);
      process.exit(0);
    } else {
      console.error("\n❌ Gate failed!");
      console.error(`Status: ${result.status}`);
      console.error(`Duration: ${result.durationMs}ms`);
      
      if (result.error) {
        console.error(`Error: ${result.error.message}`);
        if (result.error.stack) {
          console.error(`Stack: ${result.error.stack}`);
        }
      }
      
      if (result.logs.length > 0) {
        console.error(`\nLast 5 logs:`);
        result.logs.slice(-5).forEach((log, i) => {
          console.error(`  ${i + 1}. [${log.stage}] ${log.action || "no-action"} - ${log.status}`);
          if (log.error) {
            console.error(`     Error: ${log.error.tag} - ${log.error.message}`);
          }
        });
      }
      
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
