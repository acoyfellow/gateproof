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
 * Mock LLM extraction function - simulates extracting structured info from docs
 * In production, this would call an external LLM service
 */
function extractDocumentation(
  url: string,
  intent: string,
  modelId?: string
): Effect.Effect<DocExtraction, PreflightError> {
  return Effect.gen(function* () {
    // Mock extraction - returns a simulated extraction result
    // In a real implementation, this would:
    // 1. Fetch the document from the URL
    // 2. Call an LLM (via OpenCode Zen or similar) with the doclint extraction prompt
    // 3. Parse the JSON response
    
    // For now, we return a mock result that allows most operations
    // but demonstrates the structure
    const extraction: DocExtraction = {
      capability: intent,
      inputs: ["documented inputs"],
      outputs: ["documented outputs"],
      constraints: ["some constraints"],
      failure_modes: ["error handling described"],
      invocation: "documented invocation pattern",
      authority: "requires authentication",
      reversibility: "operation is reversible",
      confidence: {
        capability: 0.8,
        inputs: 0.7,
        outputs: 0.7,
        constraints: 0.6,
        failure_modes: 0.5,
        invocation: 0.8,
        authority: 0.7,
        reversibility: 0.6
      }
    };

    return extraction;
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
    const consequenceScore = action === "delete" ? 3 : action === "write" ? 2 : action === "execute" ? 2 : 1;
    
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
