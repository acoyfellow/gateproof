#!/usr/bin/env bun
/**
 * Agent Gate Pattern — Full integration example
 *
 * Demonstrates the Act.agent() primitive with a mock Filepath container.
 * This is what a real agent gate looks like: observe NDJSON events from
 * an AI agent, assert on its behavior, and enforce authority policies.
 *
 * Run: bun run patterns/agent-first/agent-gate.ts
 */

import { Gate, Act, Assert } from "../../src/index";
import {
  createMockFilepathContainer,
  createFilepathObserveResource,
} from "../../src/filepath-backend";

// ─── 1. Create a mock Filepath container ───
// In production, this would be a real container spawned by FilepathRuntime.
// The mock lets us simulate the exact NDJSON event sequence an agent produces.

const container = createMockFilepathContainer();
const observe = createFilepathObserveResource(container, "fix-auth-agent");

// ─── 2. Simulate agent behavior ───
// These events fire asynchronously, just like a real agent's stdout stream.

setTimeout(() => {
  // Agent starts thinking
  container.emit({ type: "status", state: "thinking" });

  // Agent reads a file
  container.emit({
    type: "tool",
    name: "read_file",
    path: "src/auth.ts",
    status: "start",
  });
  container.emit({
    type: "tool",
    name: "read_file",
    path: "src/auth.ts",
    status: "done",
    output: "export function authenticate() { ... }",
  });

  // Agent explains what it found
  container.emit({
    type: "text",
    content: "Found the auth module. The session check is missing a null guard.",
  });

  // Agent writes a fix
  container.emit({
    type: "tool",
    name: "write_file",
    path: "src/auth.ts",
    status: "start",
  });
  container.emit({
    type: "tool",
    name: "write_file",
    path: "src/auth.ts",
    status: "done",
  });

  // Agent runs tests
  container.emit({
    type: "command",
    cmd: "npm test",
    status: "start",
  });
  container.emit({
    type: "command",
    cmd: "npm test",
    status: "done",
    exit: 0,
    stdout: "14 tests passed",
  });

  // Agent commits the fix
  container.emit({
    type: "commit",
    hash: "a1b2c3d",
    message: "fix: add null guard to session check in auth module",
  });

  // Agent declares done
  container.emit({
    type: "done",
    summary: "Fixed null guard issue in auth.ts. All tests pass.",
  });

  container.done();
}, 100);

// ─── 3. Run the gate ───
// Observe the agent's NDJSON stream, assert on its behavior.

const result = await Gate.run({
  name: "agent-fix-auth",
  observe,
  act: [Act.wait(50)], // Small wait for the mock events to start
  assert: [
    // The agent should produce a commit
    Assert.hasAction("commit"),
    // The agent should finish
    Assert.hasAction("done"),
    // No errors in the event stream
    Assert.noErrors(),
    // Authority: agent can commit but can't spawn children
    Assert.authority({
      canCommit: true,
      canSpawn: false,
      forbiddenTools: ["delete_file"],
    }),
  ],
  stop: { idleMs: 1000, maxMs: 5000 },
  report: "pretty",
});

if (result.status !== "success") {
  console.error(`Gate failed: ${result.error?.message}`);
  process.exit(1);
}

console.log("\nAgent completed successfully within authority bounds.");
console.log(`Evidence: ${result.evidence.actionsSeen.length} actions observed`);
console.log(`Actions: ${result.evidence.actionsSeen.join(", ")}`);
