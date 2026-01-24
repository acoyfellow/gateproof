/**
 * Stable, versioned report schemas for machine-readable gate outputs.
 * All types are fully JSON-serializable (no Error objects, no functions).
 */

export interface SerializableError {
  tag?: string;
  name: string;
  message: string;
  stack?: string;
}

export interface GateResultV1 {
  version: "1";
  status: "success" | "failed" | "timeout";
  durationMs: number;
  logs: unknown[];
  evidence: {
    requestIds: string[];
    stagesSeen: string[];
    actionsSeen: string[];
    errorTags: string[];
  };
  error?: SerializableError;
}

export interface StoryResultV1 {
  id: string;
  title: string;
  gateFile: string;
  status: "success" | "failed" | "timeout";
  durationMs: number;
  error?: SerializableError;
}

export interface PrdReportV1 {
  version: "1";
  success: boolean;
  stories: StoryResultV1[];
  failedStory?: {
    id: string;
    title: string;
    gateFile: string;
  };
  totalDurationMs: number;
}

/**
 * Converts an Error (or Error-like object) into a SerializableError.
 * Preserves Effect-tagged errors (_tag) when present.
 */
export function serializeError(error: unknown): SerializableError {
  if (error instanceof Error) {
    const errorWithTag = error as Error & { _tag?: string };
    return {
      tag: errorWithTag._tag,
      name: error.name || "Error",
      message: error.message || String(error),
      stack: error.stack,
    };
  }
  
  if (error && typeof error === "object" && "_tag" in error) {
    const tagged = error as { _tag: string; message?: string; [k: string]: unknown };
    return {
      tag: tagged._tag,
      name: tagged._tag,
      message: tagged.message || String(error),
    };
  }
  
  return {
    name: "Error",
    message: String(error),
  };
}

/**
 * Sorts arrays deterministically (alphabetically) for stable output.
 */
export function sortDeterministic<T>(arr: T[]): T[] {
  return [...arr].sort();
}

/**
 * Converts a GateResult to a fully serializable GateResultV1.
 */
export function toGateResultV1(result: {
  status: "success" | "failed" | "timeout";
  durationMs: number;
  logs: unknown[];
  evidence: {
    requestIds: string[];
    stagesSeen: string[];
    actionsSeen: string[];
    errorTags: string[];
  };
  error?: Error | unknown;
}): GateResultV1 {
  return {
    version: "1",
    status: result.status,
    durationMs: result.durationMs,
    logs: result.logs,
    evidence: result.evidence,
    error: result.error ? serializeError(result.error) : undefined,
  };
}
