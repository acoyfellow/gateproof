#!/usr/bin/env bun
/**
 * Hello World Agent
 *
 * A minimal coding agent with 5 tools: read, list, bash, edit, search.
 * Runs in a loop: prompt → LLM → tool call → result → LLM → repeat.
 *
 * Uses opencode.ai (big-pickle model) via OPENCODE_ZEN_API_KEY.
 *
 * Usage:
 *   bun run agent.ts --prompt "Your task here"
 *   bun run agent.ts --prompt "Your task" --max-turns 5
 *   bun run agent.ts --help
 *   bun run agent.ts --list-tools
 */

import { generateText, tool } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";

// Load API key from environment or .env file
const apiKey = process.env.OPENCODE_ZEN_API_KEY;

// Create the opencode provider
const opencode = createOpenAICompatible({
  name: "opencode-zen",
  apiKey: apiKey || "",
  baseURL: "https://opencode.ai/zen/v1",
});

// Tool implementations
async function executeRead(path: string): Promise<string> {
  const toolPath = `${import.meta.dir}/tools/read.ts`;
  const proc = Bun.spawn(["bun", "run", toolPath, path], { stderr: "pipe" });
  const output = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) {
    return `Error: ${stderr || "Failed to read file"}`;
  }
  return output;
}

async function executeList(path: string): Promise<string> {
  const toolPath = `${import.meta.dir}/tools/list.ts`;
  const proc = Bun.spawn(["bun", "run", toolPath, path], { stderr: "pipe" });
  const output = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) {
    return `Error: ${stderr || "Failed to list directory"}`;
  }
  return output;
}

async function executeBash(command: string): Promise<string> {
  const toolPath = `${import.meta.dir}/tools/bash.ts`;
  const proc = Bun.spawn(["bun", "run", toolPath, command], { stderr: "pipe" });
  const output = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  await proc.exited;
  return `Exit code: ${proc.exitCode}\n${output}${stderr ? `\nstderr: ${stderr}` : ""}`;
}

async function executeEdit(path: string, oldString: string, newString: string): Promise<string> {
  const toolPath = `${import.meta.dir}/tools/edit.ts`;
  const proc = Bun.spawn(["bun", "run", toolPath, path, oldString, newString], { stderr: "pipe" });
  const stderr = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) {
    return `Error: ${stderr || "Failed to edit file"}`;
  }
  return "File edited successfully";
}

async function executeSearch(pattern: string, path: string): Promise<string> {
  const toolPath = `${import.meta.dir}/tools/search.ts`;
  const proc = Bun.spawn(["bun", "run", toolPath, pattern, path], { stderr: "pipe" });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  if (proc.exitCode === 1) {
    return "No matches found";
  }
  return output;
}

// Define tools using Vercel AI SDK format
const tools = {
  read: tool({
    description: "Read the contents of a file at the given path.",
    parameters: z.object({
      path: z.string().describe("The file path to read"),
    }),
    execute: async ({ path }) => executeRead(path),
  }),
  list: tool({
    description: "List files and directories at the given path.",
    parameters: z.object({
      path: z.string().describe("The directory path to list"),
    }),
    execute: async ({ path }) => executeList(path),
  }),
  bash: tool({
    description: "Execute a shell command and return its output. Use this to run commands, create files with echo, etc.",
    parameters: z.object({
      command: z.string().describe("The shell command to execute"),
    }),
    execute: async ({ command }) => executeBash(command),
  }),
  edit: tool({
    description: "Replace a string in a file. Fails if the string is not found.",
    parameters: z.object({
      path: z.string().describe("The file path to edit"),
      old_string: z.string().describe("The string to replace"),
      new_string: z.string().describe("The replacement string"),
    }),
    execute: async ({ path, old_string, new_string }) => executeEdit(path, old_string, new_string),
  }),
  search: tool({
    description: "Search for a pattern in files using ripgrep.",
    parameters: z.object({
      pattern: z.string().describe("The regex pattern to search for"),
      path: z.string().describe("The directory to search in"),
    }),
    execute: async ({ pattern, path }) => executeSearch(pattern, path),
  }),
};

// Parse command line arguments
function parseArgs(): {
  prompt?: string;
  maxTurns: number;
  help: boolean;
  listTools: boolean;
} {
  const args = process.argv.slice(2);
  let prompt: string | undefined;
  let maxTurns = 10;
  let help = false;
  let listTools = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--prompt":
        prompt = args[++i];
        break;
      case "--max-turns":
        maxTurns = parseInt(args[++i], 10);
        break;
      case "--help":
        help = true;
        break;
      case "--list-tools":
        listTools = true;
        break;
    }
  }

  return { prompt, maxTurns, help, listTools };
}

function showHelp() {
  console.log(`
Usage: bun run agent.ts [options]

Options:
  --prompt <text>     The task for the agent to complete (required)
  --max-turns <n>     Maximum number of turns before stopping (default: 10)
  --list-tools        List all available tools
  --help              Show this help message

Environment:
  OPENCODE_ZEN_API_KEY  API key for opencode.ai (required)

Examples:
  bun run agent.ts --prompt "Create a file called hello.txt with 'Hello, World!'"
  bun run agent.ts --prompt "What files are in this directory?" --max-turns 5
`);
}

function showTools() {
  console.log("Available tools:\n");
  console.log("  read: Read the contents of a file at the given path.");
  console.log("  list: List files and directories at the given path.");
  console.log("  bash: Execute a shell command and return its output.");
  console.log("  edit: Replace a string in a file. Fails if the string is not found.");
  console.log("  search: Search for a pattern in files using ripgrep.");
}

// Main agent loop
async function runAgent(prompt: string, maxTurns: number) {
  if (!apiKey) {
    console.error("Error: OPENCODE_ZEN_API_KEY environment variable is required");
    process.exit(1);
  }

  const result = await generateText({
    model: opencode("big-pickle"),
    tools,
    maxSteps: maxTurns,
    prompt,
  });

  // Output the final text response
  if (result.text) {
    console.log(result.text);
  }
}

// Main entry point
const { prompt, maxTurns, help, listTools } = parseArgs();

if (help) {
  showHelp();
  process.exit(0);
}

if (listTools) {
  showTools();
  process.exit(0);
}

if (!prompt) {
  console.error("Error: --prompt is required");
  console.error("Run with --help for usage information");
  process.exit(1);
}

await runAgent(prompt, maxTurns);
