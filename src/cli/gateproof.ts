#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { stdin, stdout } from "node:process";

type PrdStory = {
  id: string;
  title: string;
  gateImplementation: { code: string };
  dependsOn?: string[];
};

type Prd = {
  stories: PrdStory[];
};

type Args = {
  subcommand?: string;
  inputPath?: string;
  outputPath?: string;
  endpoint: string;
  model: string;
  apiKey?: string;
  stdout: boolean;
  overwrite: boolean;
  // Smoke mode options
  prdPath?: string;
  reportPath?: string;
  checkScope: boolean;
  baseRef?: string;
  json: boolean;
};

function printHelp(): void {
  const text = [
    "gateproof",
    "",
    "Subcommands:",
    "  prdts   Generate a prd.ts from story descriptions",
    "  smoke   Run gates once without agent loop (validate setup)",
    "",
    "Usage:",
    "  npx gateproof prdts --in stories.txt --out prd.ts",
    "  echo \"User can sign up\" | npx gateproof prdts --stdout",
    "  npx gateproof smoke ./prd.ts",
    "",
    "Options (prdts):",
    "  -i, --in <path>        Input file with one story per line",
    "  -o, --out <path>       Output file path (default: ./prd.ts)",
    "  --stdout               Print the generated prd.ts to stdout",
    "  --endpoint <url>       API base URL (default: https://opencode.ai/zen/v1)",
    "  --model <id>           Model id (default: big-pickle)",
    "  --api-key <key>        API key (or set OPENCODE_ZEN_API_KEY)",
    "  --overwrite            Overwrite output file if it exists",
    "",
    "Options (smoke):",
    "  --report <path>        Write JSON report to path",
    "  --check-scope          Validate scope constraints against git diff",
    "  --base-ref <ref>       Git ref for scope checking (default: HEAD)",
    "  --json                 Output results as JSON",
    "",
    "  -h, --help             Show help",
  ].join("\n");

  stdout.write(`${text}\n`);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    endpoint: "https://opencode.ai/zen/v1",
    model: "big-pickle",
    stdout: false,
    overwrite: false,
    checkScope: false,
    json: false,
  };

  if (argv.length > 0 && !argv[0].startsWith("-")) {
    args.subcommand = argv.shift();
  }

  // For smoke command, first non-flag arg is prd path
  let foundPrdPath = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--in":
      case "-i":
        args.inputPath = argv[++i];
        break;
      case "--out":
      case "-o":
        args.outputPath = argv[++i];
        break;
      case "--endpoint":
        args.endpoint = argv[++i];
        break;
      case "--model":
        args.model = argv[++i];
        break;
      case "--api-key":
        args.apiKey = argv[++i];
        break;
      case "--stdout":
        args.stdout = true;
        break;
      case "--overwrite":
        args.overwrite = true;
        break;
      case "--report":
        args.reportPath = argv[++i];
        break;
      case "--check-scope":
        args.checkScope = true;
        break;
      case "--base-ref":
        args.baseRef = argv[++i];
        break;
      case "--json":
        args.json = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        if (arg && arg.startsWith("-")) {
          throw new Error(`Unknown flag: ${arg}`);
        }
        // Positional argument - treat as prd path for smoke command
        if (!foundPrdPath && args.subcommand === "smoke") {
          args.prdPath = arg;
          foundPrdPath = true;
        }
    }
  }

  return args;
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    stdin.setEncoding("utf8");
    stdin.on("data", (chunk) => {
      data += chunk;
    });
    stdin.on("end", () => resolve(data));
    stdin.on("error", reject);
  });
}

async function getDescriptions(inputPath?: string): Promise<string> {
  if (inputPath) {
    return readFile(inputPath, "utf8");
  }
  if (stdin.isTTY) {
    process.stderr.write("Paste story descriptions, then press Ctrl-D.\n");
  }
  return readStdin();
}

function stripCodeFences(text: string): string {
  return text.replace(/```(?:json|ts|typescript)?/g, "").replace(/```/g, "").trim();
}

function extractJson(text: string): unknown {
  const cleaned = stripCodeFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract the first JSON object or array.
    const objectStart = cleaned.indexOf("{");
    const objectEnd = cleaned.lastIndexOf("}");
    if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
      try {
        return JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
      } catch {
        // continue
      }
    }
    const arrayStart = cleaned.indexOf("[");
    const arrayEnd = cleaned.lastIndexOf("]");
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
      return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
    }
    throw new Error("Model response did not contain valid JSON.");
  }
}

type StoryShape = {
  id?: unknown;
  title?: unknown;
  gateImplementation?: unknown;
  gateImplementationCode?: unknown;
  dependsOn?: unknown;
  depends_on?: unknown;
};

function normalizePrd(input: unknown): unknown {
  if (Array.isArray(input)) {
    return { stories: input };
  }

  if (input && typeof input === "object" && "prd" in input) {
    const prdValue = (input as { prd?: unknown }).prd;
    if (prdValue && typeof prdValue === "object") {
      return prdValue;
    }
  }

  if (!input || typeof input !== "object") return input;

  const root = input as { stories?: unknown };
  if (!Array.isArray(root.stories)) return input;

  const normalizedStories = root.stories.map((story) => {
    if (!story || typeof story !== "object") return story;
    const s = story as StoryShape;
    const gateImplementation =
      s.gateImplementation ?? s.gateImplementationCode ?? (s as { gateImplementation_code?: unknown }).gateImplementation_code;
    const dependsOn = s.dependsOn ?? s.depends_on;
    return {
      ...s,
      gateImplementation,
      dependsOn,
    };
  });

  return { ...root, stories: normalizedStories };
}

function coercePrd(input: unknown): Prd {
  const normalized = normalizePrd(input);
  if (!normalized || typeof normalized !== "object") {
    throw new Error("PRD output must be an object.");
  }
  const storiesValue = (normalized as { stories?: unknown }).stories;
  if (!Array.isArray(storiesValue)) {
    throw new Error("PRD output must include stories[].");
  }
  const stories: PrdStory[] = storiesValue.map((story, index) => {
    if (!story || typeof story !== "object") {
      throw new Error(`stories[${index}] must be an object.`);
    }
    const s = story as Record<string, unknown>;
    const id = s.id;
    const title = s.title;
    const gateImplementation = s.gateImplementation;
    const dependsOn = s.dependsOn;

    if (typeof id !== "string" || id.length === 0) {
      throw new Error(`stories[${index}].id must be a non-empty string.`);
    }
    if (typeof title !== "string" || title.length === 0) {
      throw new Error(`stories[${index}].title must be a non-empty string.`);
    }

    let code: string | undefined;
    if (typeof gateImplementation === "string") {
      code = gateImplementation;
    } else if (gateImplementation && typeof gateImplementation === "object") {
      const codeValue = (gateImplementation as { code?: unknown }).code;
      if (typeof codeValue === "string") code = codeValue;
    }
    if (!code) {
      throw new Error(`stories[${index}].gateImplementation.code must be a string.`);
    }

    let dependsOnArray: string[] | undefined;
    if (dependsOn !== undefined) {
      if (!Array.isArray(dependsOn)) {
        throw new Error(`stories[${index}].dependsOn must be an array of strings.`);
      }
      for (const dep of dependsOn) {
        if (typeof dep !== "string" || dep.length === 0) {
          throw new Error(`stories[${index}].dependsOn must be an array of strings.`);
        }
      }
      dependsOnArray = dependsOn as string[];
    }

    return {
      id,
      title,
      gateImplementation: { code },
      ...(dependsOnArray ? { dependsOn: dependsOnArray } : {}),
    };
  });

  return { stories };
}

function buildPrompt(promptText: string): string {
  return `Transform the following product prompt into a structured PRD object with inline gate implementations.

Prompt:
${promptText}

Requirements:
1. Generate kebab-case IDs for each story (e.g., "user-signup", "email-verification")
2. Create clear, descriptive titles
3. For each story, generate a complete gate implementation in the gateImplementation.code field
4. Gate implementations should:
   - Use createHttpObserveResource or createEmptyObserveResource for observation
   - Include appropriate Act actions (Act.wait, Act.browser, etc.)
   - Include Assert.custom or Assert.noErrors assertions
   - Be self-contained and runnable
   - Match the story's intent (e.g., if story is about API health, gate should check API endpoint)
5. Infer dependencies from the prompt (e.g., if a story mentions "depends on signup", add "user-signup" to dependsOn)
6. If dependencies are mentioned in natural language, map them to the appropriate story IDs

For gate implementations, use this EXACT pattern (return the gate spec directly):
\`\`\`
import { Gate, Act, Assert, createHttpObserveResource, createEmptyObserveResource } from "gateproof";

export function run() {
  return {
    name: "story-id",
    observe: createHttpObserveResource({ url: API_URL + "/endpoint", pollInterval: 500 }),
    act: [Act.wait(500)],
    assert: [
      Assert.custom("check_name", async (logs) => {
        const httpLog = logs.find(l => l.stage === "http");
        return httpLog?.status === "success";
      })
    ],
    stop: { idleMs: 1000, maxMs: 10000 }
  };
}
\`\`\`

IMPORTANT: The gateImplementation.code field must contain COMPLETE, runnable TypeScript code that:
- Imports necessary functions from "gateproof"
- Exports a function called "run" that returns a gate spec object
- Uses the configuration variables (API_URL, TEST_URL) defined at the top
- Includes proper assertions that match the story's intent

Return ONLY JSON in this shape (no markdown):
{
  "stories": [
    {
      "id": "story-id",
      "title": "Story title",
      "gateImplementation": { "code": "TypeScript code string" },
      "dependsOn": ["optional-story-id"]
    }
  ]
}`;
}

async function requestPrd(endpoint: string, model: string, apiKey: string, descriptions: string): Promise<Prd> {
  const response = await fetch(`${endpoint.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 3200,
      messages: [
        {
          role: "user",
          content: buildPrompt(descriptions),
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Opencode request failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Opencode response did not include content.");
  }

  const json = extractJson(content);
  return coercePrd(json);
}

function formatPrdFile(prd: Prd): string {
  const gateMap = prd.stories.map((story) => {
    const functionName = story.id.replace(/-/g, "_");
    let gateCode = story.gateImplementation.code;
    gateCode = gateCode.replace(/export\s+function\s+run\s*\(\)/g, `function ${functionName}Gate()`);
    gateCode = gateCode.replace(/export\s+/g, "");
    if (!gateCode.includes("return {")) {
      gateCode = gateCode.replace(
        /function\s+\w+Gate\(\)\s*\{/,
        `function ${functionName}Gate() {\n  return`
      );
    }
    return { story, functionName, gateCode };
  });

  const gateFunctions = gateMap
    .map(({ story, gateCode }) => {
      return `// Gate: ${story.title}
${gateCode}
`;
    })
    .join("\n");

  const gateMapObject = gateMap
    .map(({ story, functionName }) => {
      return `    "${story.id}": ${functionName}Gate,`;
    })
    .join("\n");

  return `#!/usr/bin/env bun
/**
 * gateproof PRD - Single File
 * 
 * Complete PRD with inline gate implementations.
 * Add your API keys/config at the top and run: bun run prd.ts
 */

// ============================================================================
// CONFIGURATION
// ============================================================================
const API_URL = process.env.API_URL || "https://your-api.com";
const TEST_URL = process.env.TEST_URL || "http://localhost:3000";

// ============================================================================
// GATE IMPLEMENTATIONS
// ============================================================================

import { Gate, Act, Assert, createHttpObserveResource, createEmptyObserveResource } from "gateproof";

${gateFunctions}

// ============================================================================
// PRD DEFINITION & EXECUTION
// ============================================================================

const stories = [
${prd.stories
  .map((story) => {
    return `  {
    id: "${story.id}",
    title: "${story.title}",${story.dependsOn ? `\n    dependsOn: [${story.dependsOn.map((id) => `"${id}"`).join(", ")}],` : ""}
  }`;
  })
  .join(",\n")}
];

const gates: Record<string, () => ReturnType<typeof Gate.run> extends Promise<infer T> ? T : never> = {
${gateMapObject}
};

async function runPrd() {
  const byId = new Map(stories.map((s) => [s.id, s]));
  const executed = new Set<string>();
  const visiting = new Set<string>();

  function visit(id: string): string[] {
    if (visiting.has(id)) {
      throw new Error(\`Dependency cycle detected: \${id}\`);
    }
    if (executed.has(id)) {
      return [];
    }

    visiting.add(id);
    const story = byId.get(id);
    if (!story) {
      throw new Error(\`Unknown story: \${id}\`);
    }

    const order: string[] = [];
    for (const depId of story.dependsOn || []) {
      order.push(...visit(depId));
    }

    visiting.delete(id);
    executed.add(id);
    order.push(id);
    return order;
  }

  const executionOrder = stories.flatMap((s) => visit(s.id));
  const uniqueOrder = Array.from(new Set(executionOrder));

  for (const storyId of uniqueOrder) {
    const story = byId.get(storyId);
    if (!story) continue;

    console.log(\`\\n--- \${story.id}: \${story.title}\`);
    const gateFn = gates[storyId];
    if (!gateFn) {
      throw new Error(\`No gate implementation for story: \${storyId}\`);
    }

    const gateSpec = gateFn();
    const result = await Gate.run(gateSpec);

    if (result.status !== "success") {
      console.error(\`\\n❌ PRD failed at: \${story.id} - \${story.title}\`);
      if (result.error) {
        console.error(\`Error: \${result.error.message}\`);
      }
      process.exit(1);
    }
  }

  console.log("\\n✅ All PRD stories passed!");
}

if (import.meta.main) {
  runPrd().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
`;
}

async function runPrdts(args: Args): Promise<void> {
  const descriptions = (await getDescriptions(args.inputPath)).trim();
  if (!descriptions) {
    throw new Error("No story descriptions found.");
  }

  const apiKey = args.apiKey ?? process.env.OPENCODE_ZEN_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENCODE_ZEN_API_KEY. Pass --api-key or set OPENCODE_ZEN_API_KEY.");
  }

  const prd = await requestPrd(args.endpoint, args.model, apiKey, descriptions);
  const prdFile = formatPrdFile(prd);

  if (args.stdout) {
    stdout.write(prdFile);
    return;
  }

  const outputPath = args.outputPath ?? "prd.ts";
  if (existsSync(outputPath) && !args.overwrite) {
    throw new Error(`Refusing to overwrite ${outputPath}. Use --overwrite to replace it.`);
  }

  await writeFile(outputPath, prdFile, "utf8");
  stdout.write(`✅ Wrote ${outputPath}\n`);
}

async function runSmoke(args: Args): Promise<void> {
  const prdPath = args.prdPath ?? "prd.ts";

  if (!existsSync(prdPath)) {
    throw new Error(`PRD file not found: ${prdPath}`);
  }

  // Dynamic import the prd module
  const { runPrd } = await import("../prd/runner");
  const { resolve } = await import("node:path");

  // Load the PRD file
  const absolutePath = resolve(process.cwd(), prdPath);
  const mod = await import(`file://${absolutePath}`);

  let prd: { stories: readonly { id: string; title: string; gateFile: string }[] };
  if (mod.default && typeof mod.default === "object" && "stories" in mod.default) {
    prd = mod.default;
  } else if (mod.prd && typeof mod.prd === "object" && "stories" in mod.prd) {
    prd = mod.prd;
  } else {
    throw new Error(`PRD file must export 'prd' or a default object with 'stories': ${prdPath}`);
  }

  stdout.write(`\n🔥 Smoke test: ${prdPath}\n`);
  stdout.write(`   Stories: ${prd.stories.length}\n`);
  stdout.write(`   Scope check: ${args.checkScope ? "enabled" : "disabled"}\n\n`);

  const result = await runPrd(prd, process.cwd(), {
    reportPath: args.reportPath,
    checkScope: args.checkScope,
    baseRef: args.baseRef,
  });

  if (args.json) {
    stdout.write(JSON.stringify(result.report ?? { success: result.success }, null, 2) + "\n");
  } else if (result.success) {
    stdout.write(`\n✅ Smoke test passed! All ${prd.stories.length} gates green.\n`);
  } else {
    stdout.write(`\n❌ Smoke test failed at: ${result.failedStory?.id ?? "unknown"}\n`);
    if (result.error) {
      stdout.write(`   Error: ${result.error.message}\n`);
    }
    process.exit(1);
  }
}

async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.subcommand || args.subcommand === "help") {
      printHelp();
      process.exit(0);
    }

    switch (args.subcommand) {
      case "prdts":
        await runPrdts(args);
        break;
      case "smoke":
        await runSmoke(args);
        break;
      default:
        throw new Error(`Unknown subcommand: ${args.subcommand}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stdout.write(`❌ ${message}\n`);
    process.exit(1);
  }
}

void main();
