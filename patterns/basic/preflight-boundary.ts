/**
 * Preflight Boundary Pattern
 * 
 * This example demonstrates how to use the preflight boundary to validate
 * that an action is safe to perform before executing it.
 * 
 * The preflight boundary evaluates:
 * - Intent validation: Is the action clearly documented?
 * - Authority: Are credentials/permissions documented?
 * - Effect bounding: Are side effects clearly bounded?
 * - Failure semantics: Are failure modes documented?
 * - Reversibility: Is the operation reversible?
 * - Invocation integrity: Is the invocation pattern documented?
 */

import { Gate, Act, Assert, Preflight } from "../src/index";
import type { PreflightSpec } from "../src/index";
import { CloudflareProvider } from "../src/cloudflare/index";
import { Effect } from "effect";

// Example 1: Standalone preflight check
async function standalonePreflightExample() {
  const preflight: PreflightSpec = {
    url: "https://api.example.com/docs",
    intent: "delete user data",
    action: "delete",
    modelId: "claude-3-sonnet" // optional: override default model
  };

  const result = await Effect.runPromise(Preflight.check(preflight));

  console.log(`Decision: ${result.decision}`);
  console.log(`Justification: ${result.justification}`);
  
  if (result.decision === "ASK" && result.questions) {
    console.log("Questions to clarify:");
    result.questions.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
  }

  if (result.decision === "DENY") {
    console.log("❌ Action denied - do not proceed");
    return;
  }

  if (result.decision === "ASK") {
    console.log("⚠️  Action requires clarification");
    // In a real implementation, you would collect answers here
    return;
  }

  console.log("✅ Action allowed - safe to proceed");
}

// Example 2: Integrated with Gate
async function integratedGateExample() {
  const provider = CloudflareProvider({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    apiToken: process.env.CLOUDFLARE_API_TOKEN!
  });

  const result = await Gate.run({
    name: "safe-delete-operation",
    
    // Preflight check runs BEFORE actions
    preflight: {
      url: "https://api.example.com/docs/delete",
      intent: "delete temporary cache entries",
      action: "delete"
    },
    
    // If preflight returns DENY, these actions won't run
    observe: provider.observe({ backend: "analytics", dataset: "worker_logs" }),
    act: [
      Act.exec("./cleanup-cache.sh"),
      Act.wait(1000)
    ],
    
    // Normal assertions still apply
    assert: [
      Assert.noErrors(),
      Assert.hasAction("cache_cleanup")
    ]
  });

  if (result.status === "success") {
    console.log("✅ Gate passed with preflight validation");
  } else {
    console.log("❌ Gate failed:", result.error);
  }
}

// Example 3: Different action types
async function actionTypesExample() {
  // Read action - least strict
  const readPreflight: PreflightSpec = {
    url: "https://api.example.com/docs/read",
    intent: "read user profile data",
    action: "read"
  };

  // Write action - more strict
  const writePreflight: PreflightSpec = {
    url: "https://api.example.com/docs/write",
    intent: "update user preferences",
    action: "write"
  };

  // Delete action - most strict
  const deletePreflight: PreflightSpec = {
    url: "https://api.example.com/docs/delete",
    intent: "permanently delete user account",
    action: "delete"
  };

  // Execute action - strict for side effects
  const executePreflight: PreflightSpec = {
    url: "https://api.example.com/docs/execute",
    intent: "run migration script",
    action: "execute"
  };

  const results = await Promise.all([
    Effect.runPromise(Preflight.check(readPreflight)),
    Effect.runPromise(Preflight.check(writePreflight)),
    Effect.runPromise(Preflight.check(deletePreflight)),
    Effect.runPromise(Preflight.check(executePreflight))
  ]);

  results.forEach((result, i) => {
    const actions = ["read", "write", "delete", "execute"];
    console.log(`${actions[i]}: ${result.decision} - ${result.justification}`);
  });
}

// Example 4: Handling different decision types
async function handleDecisionsExample() {
  const preflight: PreflightSpec = {
    url: "https://api.example.com/docs",
    intent: "perform sensitive operation",
    action: "write"
  };

  const result = await Effect.runPromise(Preflight.check(preflight));

  switch (result.decision) {
    case "ALLOW":
      console.log("✅ ALLOW - proceeding with action");
      // Execute the action
      break;

    case "ASK":
      console.log("⚠️  ASK - clarification needed");
      console.log(`Reason: ${result.justification}`);
      if (result.questions) {
        console.log("Please answer:");
        result.questions.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
      }
      // Collect answers and retry with more context
      break;

    case "DENY":
      console.log("❌ DENY - action blocked");
      console.log(`Reason: ${result.justification}`);
      // Do not proceed, log the denial
      break;
  }
}

// Run examples (uncomment to use)
// standalonePreflightExample();
// integratedGateExample();
// actionTypesExample();
// handleDecisionsExample();

export {
  standalonePreflightExample,
  integratedGateExample,
  actionTypesExample,
  handleDecisionsExample
};
