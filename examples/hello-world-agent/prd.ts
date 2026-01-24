#!/usr/bin/env bun
/**
 * Hello World Agent PRD
 *
 * Build a minimal coding agent with the 5 essential primitives:
 * Read, List, Bash, Edit, Search
 *
 * Then verify the agent loop works end-to-end.
 *
 * Run with: bun run examples/hello-world-agent/prd.ts
 */

import { definePrd, runPrd } from "../../src/prd/index";

export const prd = definePrd({
  stories: [
    // === PRIMITIVE: READ ===
    {
      id: "read-tool",
      title: "Read tool loads file contents into context",
      gateFile: "./gates/read-tool.gate.ts",
      scope: {
        allowedPaths: ["src/tools/read.ts", "src/tools/index.ts"],
        maxChangedFiles: 3,
      },
    },

    // === PRIMITIVE: LIST ===
    {
      id: "list-tool",
      title: "List tool enumerates files and directories",
      gateFile: "./gates/list-tool.gate.ts",
      scope: {
        allowedPaths: ["src/tools/list.ts", "src/tools/index.ts"],
        maxChangedFiles: 3,
      },
    },

    // === PRIMITIVE: BASH ===
    {
      id: "bash-tool",
      title: "Bash tool executes shell commands and captures output",
      gateFile: "./gates/bash-tool.gate.ts",
      scope: {
        allowedPaths: ["src/tools/bash.ts", "src/tools/index.ts"],
        maxChangedFiles: 3,
      },
    },

    // === PRIMITIVE: EDIT ===
    {
      id: "edit-tool",
      title: "Edit tool modifies files with string replacement",
      gateFile: "./gates/edit-tool.gate.ts",
      scope: {
        allowedPaths: ["src/tools/edit.ts", "src/tools/index.ts"],
        maxChangedFiles: 3,
      },
    },

    // === PRIMITIVE: SEARCH ===
    {
      id: "search-tool",
      title: "Search tool finds patterns in code with ripgrep",
      gateFile: "./gates/search-tool.gate.ts",
      scope: {
        allowedPaths: ["src/tools/search.ts", "src/tools/index.ts"],
        maxChangedFiles: 3,
      },
    },

    // === AGENT LOOP ===
    {
      id: "agent-loop",
      title: "Agent loop executes tools based on LLM decisions until task complete",
      gateFile: "./gates/agent-loop.gate.ts",
      dependsOn: ["read-tool", "list-tool", "bash-tool", "edit-tool", "search-tool"],
      scope: {
        allowedPaths: ["src/agent.ts", "src/loop.ts", "src/index.ts"],
        maxChangedFiles: 5,
      },
    },

    // === END TO END ===
    {
      id: "agent-completes-task",
      title: "Agent given a task produces correct output",
      gateFile: "./gates/agent-completes-task.gate.ts",
      dependsOn: ["agent-loop"],
    },
  ],
});

if (import.meta.main) {
  const args = process.argv.slice(2);
  let reportPath: string | undefined;
  let checkScope = false;
  let baseRef: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--report" && i + 1 < args.length) {
      reportPath = args[i + 1];
      i++;
    } else if (args[i] === "--check-scope") {
      checkScope = true;
    } else if (args[i] === "--base-ref" && i + 1 < args.length) {
      baseRef = args[i + 1];
      i++;
    }
  }

  const result = await runPrd(prd, import.meta.dir, {
    reportPath,
    checkScope,
    baseRef,
  });

  if (!result.success) {
    if (result.failedStory) {
      console.error(`\n❌ PRD failed at: ${result.failedStory.id} - ${result.failedStory.title}`);
    }
    if (result.error) console.error(`Error: ${result.error.message}`);
    process.exit(1);
  }
  console.log("\n✅ All PRD stories passed!");
  if (reportPath) {
    console.log(`📊 Report written to: ${reportPath}`);
  }
  process.exit(0);
}
