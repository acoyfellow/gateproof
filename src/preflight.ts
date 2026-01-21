import { Effect, Schema } from "effect";

export type PreflightDecision = "ALLOW" | "ASK" | "DENY";

export type PreflightAction = "read" | "write" | "delete" | "execute";

export interface PreflightSpec {
  url: string;
  intent: string;
  action: PreflightAction;
  modelId?: string;
}

export interface PreflightResult {
  decision: PreflightDecision;
  justification: string;
  questions?: string[];
}

export class PreflightError extends Schema.TaggedError<PreflightError>()(
  "PreflightError",
  {
    cause: Schema.Unknown
  }
) {}

interface DocExtraction {
  capability?: string;
  inputs?: string[];
  outputs?: string[];
  constraints?: string[];
  failure_modes?: string[];
  invocation?: string;
  authority?: string;
  reversibility?: string;
  confidence: {
    capability: number;
    inputs: number;
    outputs: number;
    constraints: number;
    failure_modes: number;
    invocation: number;
    authority: number;
    reversibility: number;
  };
}

/**
 * Extraction prompt for analyzing documentation
 * Adapted from doclint for agent-first preflight validation
 */
const EXTRACTION_PROMPT = `You are evaluating documentation to determine if it's safe for an agent to proceed with an action. Your job is to extract what you understand and rate your confidence.

Read the documentation below and extract:

1. **capability**: What does this tool/API do? (1-2 sentences)
2. **inputs**: What parameters/inputs does it require? (list)
3. **outputs**: What does it return? (list)
4. **constraints**: Limitations, rate limits, requirements, boundaries (list)
5. **failure_modes**: How can this fail? What errors can occur? (list)
6. **invocation**: How do you call it? Include examples if available (string or code)
7. **authority**: What credentials/authentication/permissions are required? (string)
8. **reversibility**: Is this action reversible or irreversible? Can it be undone? (string)

For each dimension, rate your confidence from 0.0 to 1.0:
- 1.0 = Completely clear, no ambiguity
- 0.7 = Mostly clear, minor gaps
- 0.5 = Partially clear, significant assumptions required  
- 0.3 = Unclear, mostly guessing
- 0.0 = No information available

Respond ONLY with valid JSON in this exact format:
{
  "extraction": {
    "capability": "string or null",
    "inputs": ["string"] or null,
    "outputs": ["string"] or null,
    "constraints": ["string"] or null,
    "failure_modes": ["string"] or null,
    "invocation": "string or null",
    "authority": "string or null",
    "reversibility": "string or null"
  },
  "confidence": {
    "capability": 0.0,
    "inputs": 0.0,
    "outputs": 0.0,
    "constraints": 0.0,
    "failure_modes": 0.0,
    "invocation": 0.0,
    "authority": 0.0,
    "reversibility": 0.0
  }
}

Documentation to evaluate:
`;

/**
 * Fetch documentation from a URL
 */
async function fetchDocumentation(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      // If it's JSON, stringify it for analysis
      const json = await response.json();
      return JSON.stringify(json, null, 2);
    }
    return await response.text();
  } catch (error) {
    throw new Error(`Failed to fetch documentation from ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Call OpenAI API to extract structured information from documentation
 */
async function callOpenAI(content: string, modelId?: string): Promise<DocExtraction> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required for preflight checks");
  }

  const model = modelId || "gpt-4o-mini";
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: EXTRACTION_PROMPT + content
          }
        ],
        temperature: 0,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json() as {
      choices: Array<{
        message: {
          content: string;
        };
      }>;
    };

    const responseText = data.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    let parsed: {
      extraction: {
        capability?: string | null;
        inputs?: string[] | null;
        outputs?: string[] | null;
        constraints?: string[] | null;
        failure_modes?: string[] | null;
        invocation?: string | null;
        authority?: string | null;
        reversibility?: string | null;
      };
      confidence: {
        capability: number;
        inputs: number;
        outputs: number;
        constraints: number;
        failure_modes: number;
        invocation: number;
        authority: number;
        reversibility: number;
      };
    };

    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      // Try to extract JSON from the response if it has markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        parsed = JSON.parse(jsonText);
      } else {
        throw new Error("Could not parse OpenAI response as JSON");
      }
    }

    // Convert to DocExtraction format
    const extraction: DocExtraction = {
      capability: parsed.extraction.capability || undefined,
      inputs: parsed.extraction.inputs || undefined,
      outputs: parsed.extraction.outputs || undefined,
      constraints: parsed.extraction.constraints || undefined,
      failure_modes: parsed.extraction.failure_modes || undefined,
      invocation: parsed.extraction.invocation || undefined,
      authority: parsed.extraction.authority || undefined,
      reversibility: parsed.extraction.reversibility || undefined,
      confidence: parsed.confidence
    };

    return extraction;
  } catch (error) {
    throw new Error(`OpenAI extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract structured information from documentation
 * Optionally uses OpenAI if OPENAI_API_KEY is set
 */
function extractDocumentation(
  url: string,
  intent: string,
  modelId?: string
): Effect.Effect<DocExtraction, PreflightError> {
  return Effect.gen(function* () {
    // If no OpenAI API key, skip extraction and return neutral result
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Return neutral extraction that will likely result in ASK decisions
      // This allows the system to function without an API key but with reduced confidence
      return {
        capability: intent,
        inputs: undefined,
        outputs: undefined,
        constraints: undefined,
        failure_modes: undefined,
        invocation: undefined,
        authority: undefined,
        reversibility: undefined,
        confidence: {
          capability: 0.3,
          inputs: 0.0,
          outputs: 0.0,
          constraints: 0.0,
          failure_modes: 0.0,
          invocation: 0.0,
          authority: 0.0,
          reversibility: 0.0
        }
      };
    }

    try {
      // 1. Fetch the documentation from the URL
      const content = yield* Effect.promise(() => fetchDocumentation(url));
      
      // 2. Call OpenAI to extract structured information
      const extraction = yield* Effect.promise(() => callOpenAI(content, modelId));
      
      return extraction;
    } catch (error) {
      return yield* Effect.fail(
        new PreflightError({
          cause: error instanceof Error ? error.message : String(error)
        })
      );
    }
  });
}

/**
 * Evaluate preflight decision based on extracted documentation
 */
function evaluateDecision(
  extraction: DocExtraction,
  action: PreflightAction,
  intent: string
): PreflightResult {
  const questions: string[] = [];
  const confidence = extraction.confidence;
  
  // Rule 1: Intent Validation
  if (!extraction.capability || confidence.capability < 0.5) {
    return {
      decision: "DENY",
      justification: "Intent is not clearly mapped to a documented capability",
      questions: []
    };
  }

  // Rule 2: Authority Check
  if (!extraction.authority || confidence.authority < 0.5) {
    if (action === "write" || action === "delete" || action === "execute") {
      return {
        decision: "DENY",
        justification: "Missing documentation on identity/credentials required for this action",
        questions: []
      };
    }
    questions.push("What identity or credentials are required for this operation?");
  }

  // Rule 3: Effect Bounding
  if (action === "write" || action === "delete") {
    if (!extraction.constraints || confidence.constraints < 0.4) {
      return {
        decision: "DENY",
        justification: "Side effects are not clearly bounded in the documentation",
        questions: []
      };
    }
    if (confidence.constraints < 0.7) {
      questions.push("What are the exact boundaries and limits of this operation's side effects?");
    }
  }

  // Rule 4: Failure Semantics
  if (!extraction.failure_modes || confidence.failure_modes < 0.4) {
    return {
      decision: "DENY",
      justification: "Failure modes are not documented",
      questions: []
    };
  }
  if (confidence.failure_modes < 0.7) {
    questions.push("How does this operation fail and what error conditions should be handled?");
  }

  // Rule 5: Reversibility
  if (action === "delete" || action === "write") {
    if (!extraction.reversibility || confidence.reversibility < 0.4) {
      return {
        decision: "DENY",
        justification: "Reversibility is not documented for this potentially destructive action",
        questions: []
      };
    }
    if (confidence.reversibility < 0.7 && action === "delete") {
      questions.push("Is this delete operation reversible? If not, what are the consequences?");
    }
  }

  // Rule 6: Invocation Integrity
  if (!extraction.invocation || confidence.invocation < 0.5) {
    return {
      decision: "DENY",
      justification: "Missing documentation on how to invoke this operation",
      questions: []
    };
  }
  if (confidence.invocation < 0.8) {
    questions.push("What are the exact parameters and invocation syntax for this operation?");
  }

  // Rule 7: Uncertainty vs. Consequence
  if (questions.length > 0) {
    const uncertaintyScore = questions.length;
    
    // Consequence scores reflect the blast radius and risk level:
    // - delete: 3 (highest risk - data loss, irreversible)
    // - write: 2 (medium risk - data modification)
    // - execute: 2 (medium risk - arbitrary code execution)
    // - read: 1 (lowest risk - no modifications)
    const CONSEQUENCE_SCORES = {
      delete: 3,
      write: 2,
      execute: 2,
      read: 1
    } as const;
    
    const consequenceScore = CONSEQUENCE_SCORES[action];
    
    if (uncertaintyScore > consequenceScore) {
      return {
        decision: "DENY",
        justification: "Too much uncertainty relative to potential consequences",
        questions
      };
    }
    
    return {
      decision: "ASK",
      justification: "Intent is clear but specific details need clarification",
      questions
    };
  }

  // All checks passed
  return {
    decision: "ALLOW",
    justification: "All safety checks passed - intent, authority, effects, and invocation are clearly documented",
    questions: []
  };
}

/**
 * Run preflight check - evaluates whether it's safe to proceed with an action
 */
export function runPreflight(
  spec: PreflightSpec
): Effect.Effect<PreflightResult, PreflightError> {
  return Effect.gen(function* () {
    const extraction = yield* extractDocumentation(spec.url, spec.intent, spec.modelId);
    const result = evaluateDecision(extraction, spec.action, spec.intent);
    return result;
  });
}

/**
 * Namespace for creating preflight checks
 */
export namespace Preflight {
  export function check(spec: PreflightSpec): Effect.Effect<PreflightResult, PreflightError> {
    return runPreflight(spec);
  }
}
