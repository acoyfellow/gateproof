import type { ClaimResult } from "./claim-types";

export interface ClaimResultV1 {
  version: "1";
  kind: "claim";
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
    kind: "claim",
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
    return ["Evidence:", "  (none)"];
  }

  const lines = ["Evidence:"];
  for (const item of result.evidence) {
    lines.push(`  - [${item.kind}] ${item.id}: ${item.summary}`);
  }
  return lines;
}

export const Report = {
  text(result: ClaimResult): string {
    const lines = [
      `Claim: ${result.name}`,
      `Intent: ${result.intent}`,
      `Result: ${result.status.toUpperCase()}`,
      `Proof strength: ${result.proofStrength}`,
      `Duration: ${result.durationMs}ms`,
    ];

    if (result.phase) {
      lines.push(`Phase: ${result.phase}`);
    }

    if (result.expectation) {
      lines.push(`Expectation: ${result.expectation.reason}`);
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
