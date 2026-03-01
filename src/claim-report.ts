import type { ClaimResult } from "./claim-types";

export interface ClaimResultV1 {
  version: "1";
  kind: "gate";
  name: string;
  intent: string;
  status: ClaimResult["status"];
  proofStrength: ClaimResult["proofStrength"];
  phase?: ClaimResult["phase"];
  durationMs: number;
  startedAt: string;
  finishedAt: string;
  evidence: ClaimResult["evidence"];
  expectation?: ClaimResult["expectation"];
  notes: string[];
  error?: ClaimResult["error"];
}

export function toClaimResultV1(result: ClaimResult): ClaimResultV1 {
  return {
    version: "1",
    kind: "gate",
    name: result.name,
    intent: result.intent,
    status: result.status,
    proofStrength: result.proofStrength,
    phase: result.phase,
    durationMs: result.durationMs,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    evidence: result.evidence,
    expectation: result.expectation,
    notes: result.notes,
    error: result.error,
  };
}

function formatEvidence(result: ClaimResult): string[] {
  if (result.evidence.length === 0) {
    return ["Proof:", "  (none)"];
  }

  const lines = ["Proof:"];
  for (const item of result.evidence) {
    lines.push(`  - [${item.kind}] ${item.id}: ${item.summary}`);
  }
  return lines;
}

function formatStatus(status: ClaimResult["status"]): string {
  switch (status) {
    case "pass":
      return "PASS";
    case "fail":
      return "FAIL";
    case "skip":
      return "SKIPPED";
    case "inconclusive":
      return "NOT ENOUGH PROOF";
  }
}

export const Report = {
  text(result: ClaimResult): string {
    const lines = [
      `Gate: ${result.name}`,
      `What this gate proves: ${result.intent}`,
      `Result: ${formatStatus(result.status)}`,
      `Proof strength: ${result.proofStrength}`,
      `Duration: ${result.durationMs}ms`,
    ];

    if (result.phase) {
      lines.push(`Phase: ${result.phase}`);
    }

    if (result.expectation) {
      lines.push(`Why it passed or failed: ${result.expectation.reason}`);
    }

    lines.push(...formatEvidence(result));

    if (result.notes.length > 0) {
      lines.push("Notes:");
      for (const note of result.notes) {
        lines.push(`  - ${note}`);
      }
    }

    if (result.error) {
      lines.push(`Error: ${result.error.name}: ${result.error.message}`);
    }

    return lines.join("\n");
  },

  json(result: ClaimResult): string {
    return JSON.stringify(toClaimResultV1(result), null, 2);
  },
};
