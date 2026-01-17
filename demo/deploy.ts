#!/usr/bin/env bun
/**
 * Deploy demo worker using Alchemy
 * Alchemy will auto-generate wrangler.jsonc from alchemy.run.ts
 */

import { $ } from "bun";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

if (!accountId || !apiToken) {
  console.error("Error: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required");
  process.exit(1);
}

console.log("🚀 Deploying gateproof demo worker with Alchemy...");

// Alchemy will read alchemy.run.ts and deploy
// Note: Alchemy uses login/auth, not env vars directly
await $`bun alchemy deploy`.cwd("./demo");

console.log("✅ Demo worker deployed!");
console.log(`📍 Worker URL: https://gateproof-demo.${accountId}.workers.dev`);
console.log(`🌐 Custom Domain: https://gateproof.coey.dev`);
console.log("\n🚪 Running production gates...");

// Wait a moment for deployment to propagate
await new Promise((resolve) => setTimeout(resolve, 3000));

// Run production gates
const { $ } = await import("bun");
try {
  await $`bun run gate:production`.cwd("..");
  console.log("✅ Production gates passed!");
} catch (error) {
  console.error("❌ Production gates failed - please check manually");
  console.error(error);
  if (process.env.SKIP_TESTS !== "1") {
    process.exit(1);
  }
}