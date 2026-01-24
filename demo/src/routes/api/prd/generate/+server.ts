import type { RequestEvent } from "@sveltejs/kit";
import { generateObject } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "$env/dynamic/private";

const gateImplementationSchema = z.object({
  code: z.string().describe("Complete gate implementation code as a function that returns a gate spec"),
});

const storySchema = z.object({
  id: z.string().describe("Kebab-case story ID (e.g., 'user-signup')"),
  title: z.string().describe("Human-readable story title"),
  gateImplementation: gateImplementationSchema.describe("Complete gate implementation code"),
  dependsOn: z.array(z.string()).optional().describe("Array of story IDs this story depends on"),
});

const prdSchema = z.object({
  stories: z.array(storySchema),
});

export const POST = async ({ platform, request }: RequestEvent) => {
  try {
    const { descriptions } = (await request.json()) as {
      descriptions: string;
    };

    if (!descriptions || !descriptions.trim()) {
      return new Response(
        JSON.stringify({
          error: "Missing descriptions",
          message: "Please provide story descriptions",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Access env var: platform.env for Cloudflare Workers (both prod and dev with Alchemy)
    // Alchemy passes env vars from alchemy.run.ts to platform.env
    // Fallback to $env/dynamic/private for non-Alchemy local dev
    const apiKey = platform?.env?.OPENCODE_ZEN_API_KEY ?? env.OPENCODE_ZEN_API_KEY ?? process.env.OPENCODE_ZEN_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing API key",
          message: "OPENCODE_ZEN_API_KEY not found. In production, ensure it's set in alchemy.run.ts env. In local dev, ensure it's in .env file.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Use openai-compatible provider for models that use /chat/completions
    // big-pickle and grok-code use this endpoint
    // baseURL should be the base, SDK will append /chat/completions
    const openaiCompatible = createOpenAICompatible({
      name: "opencode-zen",
      apiKey,
      baseURL: "https://opencode.ai/zen/v1",
    });

    // Use big-pickle which is free and uses /chat/completions
    const { object: prd } = await generateObject({
      model: openaiCompatible("big-pickle"),
      schema: prdSchema,
      maxRetries: 1,
      messages: [
        {
          role: "user",
          content: `Transform the following story descriptions into a structured PRD for gateproof with inline gate implementations.

Story descriptions:
${descriptions}

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
5. Infer dependencies from story descriptions (e.g., if a story mentions "depends on signup", add "user-signup" to dependsOn)
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

Return a properly structured PRD object with complete gate implementations for each story.`,
        },
      ],
    });

    // Format as single encapsulated file with inline gates
    const gateMap = prd.stories.map((story) => {
      const functionName = story.id.replace(/-/g, "_");
      // Clean up the gate implementation code
      let gateCode = story.gateImplementation.code;
      // Remove export and make it a regular function
      gateCode = gateCode.replace(/export\s+function\s+run\s*\(\)/g, `function ${functionName}Gate()`);
      gateCode = gateCode.replace(/export\s+/g, "");
      // Ensure it returns the gate spec
      if (!gateCode.includes("return {")) {
        gateCode = gateCode.replace(/function\s+\w+Gate\(\)\s*\{/, `function ${functionName}Gate() {\n  return`);
      }
      
      return { story, functionName, gateCode };
    });

    const gateFunctions = gateMap
      .map(({ story, functionName, gateCode }) => {
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

    const prdFile = `#!/usr/bin/env bun
/**
 * gateproof PRD - Single File Demo
 * 
 * Complete PRD with inline gate implementations.
 * Just add your API keys/config at the top and run: bun run prd.ts
 * 
 * This demonstrates single-file encapsulation - everything you need is here.
 */

// ============================================================================
// CONFIGURATION - Add your API keys and config here
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

// Map story IDs to their gate functions
const gates: Record<string, () => ReturnType<typeof Gate.run> extends Promise<infer T> ? T : never> = {
${gateMapObject}
};

// Simple PRD runner that executes gates in dependency order
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

    return new Response(
      JSON.stringify({
        success: true,
        prdFile,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("PRD generation error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return new Response(
      JSON.stringify({
        error: "PRD generation failed",
        message: errorMessage,
        stack: errorStack,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
