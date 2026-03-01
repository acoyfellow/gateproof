export type ClaimStatus = "pass" | "fail" | "skip" | "inconclusive";

export type EvidenceKind =
  | "outcome"
  | "control_plane"
  | "telemetry";

export type ProofStrength = "strong" | "moderate" | "weak";

export type MaybePromise<T> = T | Promise<T>;

export interface EvidenceRecord<T = unknown> {
  id: string;
  kind: EvidenceKind;
  source: string;
  summary: string;
  data: T;
  collectedAt: string;
}

export interface Requirement {
  minKinds?: EvidenceKind[];
  minProofStrength?: ProofStrength;
}

export interface ExpectationResult {
  ok: boolean;
  reason: string;
  measured?: Record<string, number | string | boolean>;
}

export interface ClaimContext {
  env: Record<string, string | undefined>;
  target?: string;
  metadata?: Record<string, unknown>;
}

export type ClaimStep = (ctx: ClaimContext) => MaybePromise<void>;
export type PrerequisiteCheck = (ctx: ClaimContext) => MaybePromise<boolean>;
export type EvidenceCollector =
  (ctx: ClaimContext) => MaybePromise<EvidenceRecord | EvidenceRecord[]>;
export type ExpectationCheck =
  (evidence: EvidenceRecord[], ctx: ClaimContext) => MaybePromise<ExpectationResult>;

export interface ClaimDefinition {
  name: string;
  intent: string;
  setup?: ClaimStep[];
  prerequisites?: PrerequisiteCheck[];
  exercise: ClaimStep;
  collect: EvidenceCollector[];
  expect: ExpectationCheck;
  requirements?: Requirement;
  cleanup?: ClaimStep[];
}

export interface ClaimSerializableError {
  name: string;
  message: string;
  stack?: string;
}

export interface ClaimResult {
  name: string;
  intent: string;
  status: ClaimStatus;
  proofStrength: ProofStrength;
  evidence: EvidenceRecord[];
  expectation?: ExpectationResult;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  notes: string[];
  phase?: "prerequisites" | "setup" | "exercise" | "collect" | "expectation" | "cleanup";
  error?: ClaimSerializableError;
}
