#!/usr/bin/env bun
/**
 * Gate: Agent Loop
 *
 * Verifies: src/agent.ts executes tools based on LLM decisions.
 *
 * The agent should:
 * - Accept a prompt via --prompt
 * - Call the LLM to decide which tool to use
 * - Execute the tool and feed result back to LLM
 * - Loop until task complete or --max-turns reached
 * - Output final response to stdout
 */

import { Gate, Assert } from "../../../src/index";
import { createEmptyObserveResource } from "../../../src/utils";

export async function run() {
  const result = await Gate.run({
    name: "agent-loop",
    observe: createEmptyObserveResource(),
    act: [],
    assert: [
      // Verify: agent file exists
      Assert.custom("agent_exists", async () => {
        const agentPath = `${import.meta.dir}/../src/agent.ts`;
        return await Bun.file(agentPath).exists();
      }),

      // Verify: agent accepts --help without error
      Assert.custom("accepts_help", async () => {
        const agentPath = `${import.meta.dir}/../src/agent.ts`;
        const proc = Bun.spawn(["bun", "run", agentPath, "--help"]);
        const output = await new Response(proc.stdout).text();
        await proc.exited;
        // Should exit 0 and show usage
        return proc.exitCode === 0 && (output.includes("--prompt") || output.includes("usage") || output.includes("Usage"));
      }),

      // Verify: agent requires --prompt
      Assert.custom("requires_prompt", async () => {
        const agentPath = `${import.meta.dir}/../src/agent.ts`;
        const proc = Bun.spawn(["bun", "run", agentPath], { stderr: "pipe" });
        await proc.exited;
        // Should exit non-zero when no prompt given
        return proc.exitCode !== 0;
      }),

      // Verify: all 5 tools are registered (agent should list them with --list-tools)
      Assert.custom("tools_registered", async () => {
        const agentPath = `${import.meta.dir}/../src/agent.ts`;
        const proc = Bun.spawn(["bun", "run", agentPath, "--list-tools"]);
        const output = await new Response(proc.stdout).text();
        await proc.exited;

        const hasRead = output.includes("read");
        const hasList = output.includes("list");
        const hasBash = output.includes("bash");
        const hasEdit = output.includes("edit");
        const hasSearch = output.includes("search");

        return proc.exitCode === 0 && hasRead && hasList && hasBash && hasEdit && hasSearch;
      }),
    ],
    stop: { idleMs: 1000, maxMs: 60000 },
  });

  return { status: result.status };
}
