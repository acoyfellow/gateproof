#!/usr/bin/env bun
/**
 * Playwright + gateproof: Realistic Examples
 * 
 * Shows why you need BOTH tools:
 * - Playwright: Validates UI behavior (what users see)
 * - gateproof: Validates backend observability (what the system logged)
 * 
 * These are complementary, not redundant.
 * 
 * Usage:
 *   bun run patterns/advanced/playwright-plus-gateproof.ts
 * 
 * Environment variables:
 *   CLOUDFLARE_ACCOUNT_ID - Cloudflare account ID
 *   CLOUDFLARE_API_TOKEN - Cloudflare API token
 *   PRODUCTION_URL - Production URL to test
 */

import { Gate, Act, Assert } from "../../src/index";
import { CloudflareProvider } from "../../src/cloudflare/index";

// ============================================================================
// Example 1: E-commerce Checkout Flow
// ============================================================================

/**
 * Scenario: User completes checkout
 * 
 * Playwright validates: UI works (button clicks, form fills, page renders)
 * gateproof validates: Backend logged the order, no errors in logs, payment processed
 * 
 * Why both? Playwright can't see Cloudflare Workers logs or backend errors.
 */

async function checkoutFlowExample() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || "";
  
  if (!accountId || !apiToken) {
    console.log("⚠️  Skipping checkout example: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required");
    return;
  }

  const provider = CloudflareProvider({ accountId, apiToken });

  console.log("\n📦 Example 1: E-commerce Checkout Flow");
  console.log("=" .repeat(60));
  console.log("Playwright would test:");
  console.log("  - User clicks 'Add to Cart'");
  console.log("  - User fills checkout form");
  console.log("  - User clicks 'Submit Order'");
  console.log("  - UI shows 'Order Confirmed' message");
  console.log("\ngateproof validates:");
  console.log("  - Backend logged 'order_created'");
  console.log("  - Payment was processed");
  console.log("  - No errors in Cloudflare Workers logs");
  console.log("  - Order ID was logged correctly");

  // gateproof: Validate backend logs
  const gate = {
    name: "checkout-backend-validation",
    observe: provider.observe({
      backend: "analytics",
      dataset: "worker_logs"
    }),
    act: [
      // In real scenario, Playwright would trigger the checkout first
      // Then we wait for logs to propagate
      Act.wait(2000),
    ],
    assert: [
      // Backend logged the order
      Assert.hasAction("order_created"),
      // Payment was processed
      Assert.hasAction("payment_processed"),
      // No errors in logs (Playwright can't see these!)
      Assert.noErrors(),
      // Order ID was logged
      Assert.custom("order_id_logged", (logs) => {
        const orderLog = logs.find(l => l.action === "order_created");
        return !!orderLog?.data?.orderId;
      }),
      // Payment amount matches order total
      Assert.custom("payment_amount_correct", (logs) => {
        const paymentLog = logs.find(l => l.action === "payment_processed");
        const orderLog = logs.find(l => l.action === "order_created");
        if (!paymentLog || !orderLog) return false;
        return paymentLog.data?.amount === orderLog.data?.total;
      }),
    ],
    stop: { idleMs: 3000, maxMs: 15000 }
  };

  const result = await Gate.run(gate);
  if (result.status === "success") {
    console.log("\n✅ Backend validation passed");
  } else {
    console.log(`\n❌ Backend validation failed: ${result.error?.message}`);
  }
}

// ============================================================================
// Example 2: User Signup with Email Verification
// ============================================================================

/**
 * Scenario: User signs up, receives email, verifies account
 * 
 * Playwright validates: Signup form works, email sent message appears
 * gateproof validates: User created in database, email queued, no backend errors
 * 
 * Why both? Playwright can't verify database writes or email queue processing.
 */

async function signupFlowExample() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || "";
  
  if (!accountId || !apiToken) {
    console.log("⚠️  Skipping signup example: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required");
    return;
  }

  const provider = CloudflareProvider({ accountId, apiToken });

  console.log("\n👤 Example 2: User Signup Flow");
  console.log("=" .repeat(60));
  console.log("Playwright would test:");
  console.log("  - User fills signup form");
  console.log("  - User clicks 'Sign Up'");
  console.log("  - UI shows 'Check your email' message");
  console.log("\ngateproof validates:");
  console.log("  - User was created in database");
  console.log("  - Email was queued for sending");
  console.log("  - No database errors");
  console.log("  - Email contains verification link");

  // gateproof: Validate backend actually did the work
  const gate = {
    name: "signup-backend-validation",
    observe: provider.observe({
      backend: "analytics",
      dataset: "worker_logs"
    }),
    act: [Act.wait(2000)],
    assert: [
      // User was created in database
      Assert.hasAction("user_created"),
      // Email was queued
      Assert.hasAction("email_queued"),
      // No database errors
      Assert.noErrors(),
      // Email contains verification link
      Assert.custom("verification_link_in_email", (logs) => {
        const emailLog = logs.find(l => l.action === "email_queued");
        if (!emailLog) return false;
        const emailBody = emailLog.data?.body as string;
        return emailBody?.includes('verify') && emailBody?.includes('token');
      }),
    ],
    stop: { idleMs: 3000, maxMs: 15000 }
  };

  const result = await Gate.run(gate);
  if (result.status === "success") {
    console.log("\n✅ Backend signup validation passed");
  } else {
    console.log(`\n❌ Backend signup validation failed: ${result.error?.message}`);
  }
}

// ============================================================================
// Example 3: API Rate Limiting
// ============================================================================

/**
 * Scenario: API enforces rate limits
 * 
 * Playwright: Can't test this effectively (needs many requests)
 * gateproof: Validates rate limit logs, throttling behavior
 * 
 * Why gateproof? Playwright is for UI, not API behavior validation.
 */

async function rateLimitExample() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || "";
  const apiUrl = process.env.API_URL || "https://api.example.com";
  
  if (!accountId || !apiToken) {
    console.log("⚠️  Skipping rate limit example: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required");
    return;
  }

  const provider = CloudflareProvider({ accountId, apiToken });

  console.log("\n🚦 Example 3: API Rate Limiting");
  console.log("=" .repeat(60));
  console.log("Playwright limitation:");
  console.log("  - Can't effectively test rate limiting (needs many requests)");
  console.log("  - Focused on UI, not API behavior");
  console.log("\ngateproof validates:");
  console.log("  - Rate limit was enforced");
  console.log("  - Requests were throttled correctly");
  console.log("  - No unexpected errors");

  // Make many requests to trigger rate limit
  console.log("\n  Making 100 requests to trigger rate limit...");
  const requests = Array.from({ length: 100 }, (_, i) => 
    fetch(`${apiUrl}/data`, {
      headers: { 'Authorization': 'Bearer test-token' }
    }).catch(() => null) // Ignore errors for demo
  );
  await Promise.all(requests);

  // gateproof: Validate rate limiting worked
  const gate = {
    name: "rate-limit-validation",
    observe: provider.observe({
      backend: "analytics",
      dataset: "worker_logs"
    }),
    act: [Act.wait(3000)],
    assert: [
      // Rate limit was enforced
      Assert.hasAction("rate_limit_exceeded"),
      // Some requests were throttled
      Assert.custom("throttling_occurred", (logs) => {
        const rateLimitLogs = logs.filter(l => l.action === "rate_limit_exceeded");
        return rateLimitLogs.length > 0;
      }),
      // No errors (rate limiting is expected behavior)
      Assert.custom("no_unexpected_errors", (logs) => {
        const errorLogs = logs.filter(l => 
          l.status === "error" && l.error?.tag !== "RateLimitExceeded"
        );
        return errorLogs.length === 0;
      }),
    ],
    stop: { idleMs: 2000, maxMs: 10000 }
  };

  const result = await Gate.run(gate);
  if (result.status === "success") {
    console.log("\n✅ Rate limit validation passed");
  } else {
    console.log(`\n❌ Rate limit validation failed: ${result.error?.message}`);
  }
}

// ============================================================================
// Example 4: Production Post-Deploy Validation
// ============================================================================

/**
 * Scenario: Deploy to production, validate it works
 * 
 * Playwright: Tests in CI with test environment
 * gateproof: Validates production observability after deploy
 * 
 * Why gateproof? Production logs are different from test logs.
 */

async function productionDeployExample() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || "";
  const productionUrl = process.env.PRODUCTION_URL || "https://app.example.com";
  
  if (!accountId || !apiToken) {
    console.log("⚠️  Skipping production example: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required");
    return;
  }

  const provider = CloudflareProvider({ accountId, apiToken });

  console.log("\n🚀 Example 4: Production Post-Deploy Validation");
  console.log("=" .repeat(60));
  console.log("Playwright limitation:");
  console.log("  - Tests in CI with test environment");
  console.log("  - Can't validate production logs");
  console.log("\ngateproof validates:");
  console.log("  - Production is responding");
  console.log("  - No errors in production logs");
  console.log("  - Response time is acceptable");
  console.log("  - Production logs show expected structure");

  // gateproof: Validate production deployment
  const gate = {
    name: "production-smoke-test",
    observe: provider.observe({
      backend: "analytics",
      dataset: "worker_logs"
    }),
    act: [
      // Trigger a real production request
      Act.exec(`curl -X POST ${productionUrl}/api/test`, { timeoutMs: 5000 }),
      Act.wait(2000),
    ],
    assert: [
      // Production is responding
      Assert.hasStage("worker"),
      // No errors in production logs
      Assert.noErrors(),
      // Response time is acceptable
      Assert.custom("acceptable_latency", (logs) => {
        const workerLogs = logs.filter(l => l.stage === "worker");
        if (workerLogs.length === 0) return false;
        const avgLatency = workerLogs.reduce((sum, log) => 
          sum + (log.durationMs || 0), 0) / workerLogs.length;
        return avgLatency < 1000; // < 1s average
      }),
      // Production logs show expected structure
      Assert.custom("production_logs_valid", (logs) => {
        return logs.every(log => 
          log.timestamp && 
          log.stage && 
          (log.status === "success" || log.status === "error")
        );
      }),
    ],
    stop: { idleMs: 2000, maxMs: 10000 }
  };

  const result = await Gate.run(gate);
  if (result.status === "success") {
    console.log("\n✅ Production deployment validated");
    console.log(`   Duration: ${result.durationMs}ms`);
    console.log(`   Logs collected: ${result.logs.length}`);
  } else {
    console.log("\n❌ Production validation failed!");
    console.log("   Evidence:", result.evidence);
    console.log("   Error:", result.error?.message);
  }
}

// ============================================================================
// Example 5: Distributed System Validation
// ============================================================================

/**
 * Scenario: Request goes through multiple services
 * 
 * Playwright: Tests one service (the frontend)
 * gateproof: Validates logs across all services
 * 
 * Why gateproof? Playwright can't see logs from API gateway, auth service, database, etc.
 */

async function distributedSystemExample() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || "";
  
  if (!accountId || !apiToken) {
    console.log("⚠️  Skipping distributed system example: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required");
    return;
  }

  const provider = CloudflareProvider({ accountId, apiToken });

  console.log("\n🌐 Example 5: Distributed System Validation");
  console.log("=" .repeat(60));
  console.log("Playwright would test:");
  console.log("  - User navigates to dashboard");
  console.log("  - Dashboard content loads");
  console.log("  - UI renders correctly");
  console.log("\ngateproof validates:");
  console.log("  - Request went through API gateway");
  console.log("  - Auth service validated token");
  console.log("  - Database query executed");
  console.log("  - Request ID propagated through all services (tracing)");

  // gateproof: Validate entire request chain
  const gate = {
    name: "distributed-system-validation",
    observe: provider.observe({
      backend: "analytics",
      dataset: "worker_logs"
    }),
    act: [Act.wait(2000)],
    assert: [
      // Request went through API gateway
      Assert.hasAction("api_gateway_request"),
      // Auth service validated token
      Assert.hasAction("auth_validated"),
      // Database query executed
      Assert.hasAction("db_query_executed"),
      // All services logged successfully
      Assert.noErrors(),
      // Request ID propagated through all services
      Assert.custom("request_id_propagated", (logs) => {
        const requestIds = logs
          .map(l => l.requestId)
          .filter((id): id is string => typeof id === "string");
        const uniqueIds = new Set(requestIds);
        // All logs should have same request ID (tracing)
        return uniqueIds.size === 1 && requestIds.length >= 3;
      }),
    ],
    stop: { idleMs: 3000, maxMs: 15000 }
  };

  const result = await Gate.run(gate);
  if (result.status === "success") {
    console.log("\n✅ Distributed system validation passed");
    console.log(`   Request IDs: ${result.evidence.requestIds.length}`);
    console.log(`   Stages seen: ${result.evidence.stagesSeen.join(", ")}`);
  } else {
    console.log(`\n❌ Distributed system validation failed: ${result.error?.message}`);
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log("🎭 Playwright + gateproof: Complementary Tools");
  console.log("\nKey Insight:");
  console.log("  Playwright validates: UI behavior (what users see)");
  console.log("  gateproof validates: Backend observability (what system logged)");
  console.log("\nYou need both because they validate different layers.");

  // Run examples (comment out ones you don't want to run)
  await checkoutFlowExample();
  await signupFlowExample();
  await rateLimitExample();
  await productionDeployExample();
  await distributedSystemExample();

  console.log("\n" + "=".repeat(60));
  console.log("💡 Summary:");
  console.log("  - Playwright: Tests frontend UI");
  console.log("  - gateproof: Tests backend observability");
  console.log("  - Together: Complete validation of your system");
  console.log("\nWhen to use gateproof:");
  console.log("  ✅ Edge/serverless deployments (Cloudflare Workers)");
  console.log("  ✅ Production post-deploy validation");
  console.log("  ✅ Distributed system validation");
  console.log("  ✅ Backend behavior validation");
  console.log("  ✅ API rate limiting and throttling");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
