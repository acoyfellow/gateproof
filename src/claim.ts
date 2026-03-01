import type {
  ClaimContext,
  ClaimDefinition,
  ClaimResult,
  ClaimSerializableError,
  EvidenceKind,
  EvidenceRecord,
  ProofStrength,
  Requirement,
} from "./claim-types";

function serializeClaimError(error: unknown): ClaimSerializableError {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || String(error),
      stack: error.stack,
    };
  }

  return {
    name: "Error",
    message: String(error),
  };
}

function strengthRank(strength: ProofStrength): number {
  switch (strength) {
    case "strong":
      return 3;
    case "moderate":
      return 2;
    case "weak":
    default:
      return 1;
  }
}

function determineProofStrength(evidence: EvidenceRecord[]): ProofStrength {
  const kinds = new Set(evidence.map((entry) => entry.kind));

  if (kinds.has("outcome")) return "strong";
  if (kinds.has("control_plane")) return "moderate";
  return "weak";
}

function requirementNotes(
  evidence: EvidenceRecord[],
  requirements?: Requirement
): { ok: boolean; notes: string[]; proofStrength: ProofStrength } {
  const notes: string[] = [];
  const proofStrength = determineProofStrength(evidence);

  if (evidence.length === 0) {
    notes.push("No evidence was collected.");
    return { ok: false, notes, proofStrength };
  }

  if (requirements?.minKinds?.length) {
    const seenKinds = new Set<EvidenceKind>(evidence.map((entry) => entry.kind));
    const missingKinds = requirements.minKinds.filter((kind) => !seenKinds.has(kind));
    if (missingKinds.length > 0) {
      notes.push(`Missing required evidence kinds: ${missingKinds.join(", ")}.`);
      return { ok: false, notes, proofStrength };
    }
  }

  if (
    requirements?.minProofStrength &&
    strengthRank(proofStrength) < strengthRank(requirements.minProofStrength)
  ) {
    notes.push(
      `Proof strength ${proofStrength} is below required ${requirements.minProofStrength}.`
    );
    return { ok: false, notes, proofStrength };
  }

  return { ok: true, notes, proofStrength };
}

async function runSteps(
  steps: ClaimDefinition["setup"] | ClaimDefinition["cleanup"],
  ctx: ClaimContext
): Promise<void> {
  if (!steps) return;

  for (const step of steps) {
    await step(ctx);
  }
}

async function collectEvidence(
  collectors: ClaimDefinition["collect"],
  ctx: ClaimContext
): Promise<EvidenceRecord[]> {
  const evidence: EvidenceRecord[] = [];

  for (const collect of collectors) {
    const result = await collect(ctx);
    if (Array.isArray(result)) {
      evidence.push(...result);
    } else {
      evidence.push(result);
    }
  }

  return evidence;
}

export class Claim {
  constructor(private readonly definition: ClaimDefinition) {}

  static define(definition: ClaimDefinition): Claim {
    return new Claim(definition);
  }

  async run(ctx: ClaimContext): Promise<ClaimResult> {
    const startedAt = Date.now();
    const startedAtIso = new Date(startedAt).toISOString();
    let evidence: EvidenceRecord[] = [];
    let expectation: ClaimResult["expectation"];
    const notes: string[] = [];
    let status: ClaimResult["status"] = "inconclusive";
    let phase: ClaimResult["phase"];
    let error: unknown;
    let proofStrength: ProofStrength | undefined;

    const finish = (input: {
      status: ClaimResult["status"];
      phase?: ClaimResult["phase"];
      error?: unknown;
      extraNotes?: string[];
      proofStrength?: ProofStrength;
    }): ClaimResult => {
      const finishedAt = Date.now();
      const serializedError = input.error ? serializeClaimError(input.error) : undefined;
      return {
        name: this.definition.name,
        intent: this.definition.intent,
        status: input.status,
        proofStrength: input.proofStrength ?? determineProofStrength(evidence),
        evidence,
        expectation,
        startedAt: startedAtIso,
        finishedAt: new Date(finishedAt).toISOString(),
        durationMs: finishedAt - startedAt,
        notes: [...notes, ...(input.extraNotes ?? [])],
        phase: input.phase,
        error: serializedError,
      };
    };

    try {
      if (this.definition.prerequisites?.length) {
        for (const check of this.definition.prerequisites) {
          const ok = await check(ctx);
          if (!ok) {
            notes.push("A prerequisite returned false.");
            status = "skip";
            phase = "prerequisites";
            proofStrength = "weak";
            break;
          }
        }
      }

      if (status !== "skip") {
        try {
          await runSteps(this.definition.setup, ctx);
        } catch (setupError) {
          status = "fail";
          phase = "setup";
          error = setupError;
        }
      }

      if (status !== "skip" && phase === undefined) {
        try {
          await this.definition.exercise(ctx);
        } catch (exerciseError) {
          status = "fail";
          phase = "exercise";
          error = exerciseError;
        }
      }

      if (status !== "skip" && phase === undefined) {
        try {
          evidence = await collectEvidence(this.definition.collect, ctx);
        } catch (collectError) {
          notes.push("Evidence collection failed before the claim could be proven.");
          status = "inconclusive";
          phase = "collect";
          error = collectError;
          proofStrength = determineProofStrength(evidence);
        }
      }

      if (status !== "skip" && phase === undefined) {
        try {
          expectation = await this.definition.expect(evidence, ctx);
        } catch (expectationError) {
          status = "fail";
          phase = "expectation";
          error = expectationError;
        }
      }

      if (status !== "skip" && phase === undefined && expectation) {
        if (!expectation.ok) {
          status = "fail";
          phase = "expectation";
        } else {
          const requirements = requirementNotes(evidence, this.definition.requirements);
          if (!requirements.ok) {
            status = "inconclusive";
            phase = "expectation";
            proofStrength = requirements.proofStrength;
            notes.push(...requirements.notes);
          } else {
            status = "pass";
            proofStrength = requirements.proofStrength;
          }
        }
      }
    } catch (unexpectedError) {
      status = "fail";
      phase = phase ?? "exercise";
      error = unexpectedError;
    } finally {
      try {
        await runSteps(this.definition.cleanup, ctx);
      } catch (cleanupError) {
        notes.push(`Cleanup failed: ${serializeClaimError(cleanupError).message}`);
      }
    }

    return finish({
      status,
      phase,
      error,
      proofStrength,
    });
  }
}
