#!/usr/bin/env bun
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateText, tool } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";

const DEFAULT_ENDPOINT = "https://opencode.ai/zen/v1";
const DEFAULT_MODEL = "big-pickle";

type LoopArgs = {
  prdPath: string;
  prompt?: string;
  maxIterations: number;
  maxTurns: number;
  model: string;
  endpoint: string;
  apiKey?: string;
};

function parseArgs(argv: string[]): LoopArgs {
  const args: LoopArgs = {
    prdPath: "prd.ts",
    maxIterations: 12,
    maxTurns: 10,
    model: DEFAULT_MODEL,
    endpoint: DEFAULT_ENDPOINT,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--prd":
        args.prdPath = argv[++i];
        break;
      case "--prompt":
        args.prompt = argv[++i];
        break;
      case "--max-iterations":
        args.maxIterations = Number(argv[++i] ?? "");
        break;
      case "--max-turns":
        args.maxTurns = Number(argv[++i] ?? "");
        break;
      case "--model":
        args.model = argv[++i];
        break;
      case "--endpoint":
        args.endpoint = argv[++i];
        break;
      case "--api-key":
        args.apiKey = argv[++i];
        break;
      case "--help":
        printHelp();
        process.exit(0);
      default:
        if (arg && arg.startsWith("-")) {
          throw new Error(`Unknown flag: ${arg}`);
        }
    }
  }

  if (Number.isNaN(args.maxIterations) || args.maxIterations < 1) {
    throw new Error("--max-iterations must be a positive number");
  }
  if (Number.isNaN(args.maxTurns) || args.maxTurns < 1) {
    throw new Error("--max-turns must be a positive number");
  }

  return args;
}

function printHelp(): void {
  console.log(`gateproof prd loop\n\nUsage:\n  bun run scripts/prd-loop.ts --prompt "Build a signup flow"\n  bun run scripts/prd-loop.ts --prd prd.ts\n\nOptions:\n  --prompt <text>         Prompt to generate prd.ts if it does not exist\n  --prd <path>            Path to prd.ts (default: ./prd.ts)\n  --max-iterations <n>    Max PRD iterations (default: 12)\n  --max-turns <n>         Max agent tool steps per iteration (default: 10)\n  --endpoint <url>        OpenCode Zen endpoint (default: ${DEFAULT_ENDPOINT})\n  --model <id>            OpenCode Zen model id (default: ${DEFAULT_MODEL})\n  --api-key <key>         API key (or set OPENCODE_ZEN_API_KEY)\n  --help                  Show help\n`);
}

async function runCommand(command: string, options: { cwd?: string; env?: Record<string, string> } = {}) {
  const proc = Bun.spawn(["/bin/sh", "-lc", command], {
    cwd: options.cwd,
    env: {
      ...process.env,
      ...options.env,
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  await proc.exited;

  return {
    code: proc.exitCode ?? 0,
    stdout,
    stderr,
  };
}

async function generatePrd(prdPath: string, prompt: string, args: { model: string; endpoint: string; apiKey: string }): Promise<void> {
  const endpointFlag = `--endpoint ${JSON.stringify(args.endpoint)}`;
  const modelFlag = `--model ${JSON.stringify(args.model)}`;
  const apiKeyFlag = `--api-key ${JSON.stringify(args.apiKey)}`;
  const proc = Bun.spawn(
    ["/bin/sh", "-lc", `bun run src/cli/gateproof.ts prdts --stdout ${endpointFlag} ${modelFlag} ${apiKeyFlag}`],
    {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        OPENCODE_ZEN_API_KEY: args.apiKey,
      },
    }
  );
  const writer = proc.stdin.getWriter();
  await writer.write(new TextEncoder().encode(prompt));
  await writer.close();
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  await proc.exited;

  if ((proc.exitCode ?? 0) !== 0) {
    throw new Error(stderr || "PRD generation failed");
  }

  if (!stdout.trim()) {
    throw new Error("PRD generation returned empty output");
  }

  writeFileSync(prdPath, stdout, "utf8");
}

function ensureLoopDir(): string {
  const dir = resolve(process.cwd(), ".gateproof");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

async function runPrd(prdPath: string): Promise<{ success: boolean; output: string } > {
  const reportDir = ensureLoopDir();
  const reportPath = resolve(reportDir, "prd-report.json");
  const result = await runCommand(`bun run ${prdPath} --report ${reportPath}`);
  const output = `${result.stdout}${result.stderr ? `\n${result.stderr}` : ""}`.trim();
  return {
    success: result.code === 0,
    output,
  };
}

function buildAgentPrompt(prdPath: string, failureOutput: string): string {
  const prdContent = readFileSync(prdPath, "utf8");
  return `You are a gateproof loop agent.\n\nGoal:\n- Make the PRD pass (all gates green).\n\nRules:\n- Use the provided tools to inspect and edit files.\n- Update the failing story's progress[] in prd.ts with a short checkpoint you completed.\n- Keep changes minimal and scoped to what's needed to pass.\n\nPRD (current):\n${prdContent}\n\nGate output (latest run):\n${failureOutput}\n`;
}

function createAgent(apiKey: string, endpoint: string) {
  const opencode = createOpenAICompatible({
    name: "opencode-zen",
    apiKey,
    baseURL: endpoint,
  });

  const tools = {
    read: tool({
      description: "Read the contents of a file at the given path.",
      parameters: z.object({
        path: z.string().describe("The file path to read"),
      }),
      execute: async ({ path }) => {
        if (!existsSync(path)) return `Error: file not found: ${path}`;
        return readFileSync(path, "utf8");
      },
    }),
    list: tool({
      description: "List files and directories at the given path.",
      parameters: z.object({
        path: z.string().describe("The directory path to list"),
      }),
      execute: async ({ path }) => {
        const result = await runCommand(`ls -a ${JSON.stringify(path)}`);
        return result.code === 0 ? result.stdout : result.stderr;
      },
    }),
    search: tool({
      description: "Search for a pattern in files using ripgrep.",
      parameters: z.object({
        pattern: z.string().describe("Regex pattern to search for"),
        path: z.string().describe("Directory to search in"),
      }),
      execute: async ({ pattern, path }) => {
        const result = await runCommand(`rg -n ${JSON.stringify(pattern)} ${JSON.stringify(path)}`);
        if (result.code === 0) return result.stdout;
        if (result.code === 1) return "No matches found";
        return result.stderr;
      },
    }),
    write: tool({
      description: "Write file contents exactly (overwrites).",
      parameters: z.object({
        path: z.string().describe("File path"),
        content: z.string().describe("Full file contents"),
      }),
      execute: async ({ path, content }) => {
        writeFileSync(path, content, "utf8");
        return `Wrote ${path}`;
      },
    }),
    replace: tool({
      description: "Replace a string in a file. Fails if the string is not found.",
      parameters: z.object({
        path: z.string().describe("File path"),
        old_string: z.string().describe("String to replace"),
        new_string: z.string().describe("Replacement string"),
      }),
      execute: async ({ path, old_string, new_string }) => {
        if (!existsSync(path)) return `Error: file not found: ${path}`;
        const content = readFileSync(path, "utf8");
        if (!content.includes(old_string)) {
          return `Error: string not found in ${path}`;
        }
        const next = content.replace(old_string, new_string);
        writeFileSync(path, next, "utf8");
        return `Updated ${path}`;
      },
    }),
    bash: tool({
      description: "Run a shell command and return its output.",
      parameters: z.object({
        command: z.string().describe("Shell command"),
      }),
      execute: async ({ command }) => {
        const result = await runCommand(command);
        return `Exit ${result.code}\n${result.stdout}${result.stderr ? `\n${result.stderr}` : ""}`.trim();
      },
    }),
  };

  return { opencode, tools };
}

async function runAgent(prompt: string, model: string, endpoint: string, apiKey: string, maxTurns: number) {
  const { opencode, tools } = createAgent(apiKey, endpoint);
  const result = await generateText({
    model: opencode(model),
    tools,
    maxSteps: maxTurns,
    prompt,
  });

  if (result.text) {
    console.log(result.text);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = args.apiKey ?? process.env.OPENCODE_ZEN_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENCODE_ZEN_API_KEY (or pass --api-key)");
  }

  if (!existsSync(args.prdPath)) {
    if (!args.prompt?.trim()) {
      throw new Error(`Missing ${args.prdPath}. Provide --prompt to generate it.`);
    }
    console.log(`Generating ${args.prdPath}...`);
    await generatePrd(args.prdPath, args.prompt.trim(), {
      model: args.model,
      endpoint: args.endpoint,
      apiKey,
    });
  }

  for (let iteration = 1; iteration <= args.maxIterations; iteration++) {
    console.log(`\n=== PRD iteration ${iteration}/${args.maxIterations} ===`);
    const result = await runPrd(args.prdPath);
    if (result.success) {
      console.log("\n✅ All PRD stories passed!");
      return;
    }

    console.log("\n❌ PRD failed. Sending output to agent...");
    const prompt = buildAgentPrompt(args.prdPath, result.output);
    await runAgent(prompt, args.model, args.endpoint, apiKey, args.maxTurns);
  }

  console.error(`\nStopped after ${args.maxIterations} iterations without passing.`);
  process.exit(1);
}

await main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n❌ ${message}`);
  process.exit(1);
});
