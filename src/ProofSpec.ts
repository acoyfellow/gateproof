/**
 * proof-spec.v0.json — TypeScript types.
 *
 * The unified schema for observe/act/assert loops. A spec describes:
 *   - a tool    (act only, unsurf-shape)
 *   - a gate    (observe + assert, gateproof-native)
 *   - a proof   (all three, with optional loop)
 *
 * ---
 *
 * This file is copied verbatim from acoyfellow/unsurf@81c3847
 * (src/domain/ProofSpec.ts). Kept in sync by hand. When it drifts (or when
 * the merge case is made), extract to a shared npm package and both repos
 * depend on it.
 *
 * Why here too: gateproof is the gate-half of the merge; unsurf is the
 * tool-half. They share this one schema. Interop == both can read/write
 * the same JSON. See the conversion helpers at the bottom of this file
 * for translating between a gateproof PlanDefinition and a ProofSpec.
 *
 * No runtime dependencies. Pure types + deterministic computeRisk().
 */

// ==================== Target ====================

export interface Target {
	/** Canonical URL the spec applies to. */
	url: string;
	/** `sha256:...` content-addressed identity. */
	fingerprint?: string;
	/** Identifier for how the fingerprint was computed, e.g. `url+ax-role-name-v1`. */
	fingerprintStrategy?: string;
}

// ==================== Role-based element addressing (DOM) ====================

export type AriaRole =
	| "button"
	| "textbox"
	| "combobox"
	| "searchbox"
	| "link"
	| "checkbox"
	| "radio"
	| "heading"
	| "img"
	| "list"
	| "listitem"
	| "table"
	| "cell"
	| "form"
	| "region"
	| "dialog"
	| "tab"
	| "tabpanel"
	| "navigation"
	| "status"
	| "option"
	| "menu"
	| "menuitem"
	| "switch"
	| "tooltip";

export interface ElementTarget {
	role: AriaRole;
	/** Accessible name — aria-label, associated label, or visible text. */
	name: string;
	/** 0-indexed among matches of (role, name). */
	nth?: number;
}

// ==================== Observe ====================

export type Observation = DomObservation | HttpObservation | ExecObservation | NoteObservation;

export interface DomObservation {
	kind: "dom";
	target: ElementTarget;
	/** What to read. Default "exists". */
	as?: "exists" | "text" | "value";
}

export interface HttpObservation {
	kind: "http";
	url: string;
	expect?: {
		status?: number;
		bodyIncludes?: string;
	};
}

export interface ExecObservation {
	kind: "exec";
	command: string;
	expect?: {
		exitCode?: number;
		stdoutIncludes?: string;
	};
}

export interface NoteObservation {
	kind: "note";
	source: string;
	field: string;
}

// ==================== Act ====================

export type DslOp =
	| { op: "click"; target: ElementTarget }
	| { op: "fill"; target: ElementTarget; value: string }
	| { op: "select"; target: ElementTarget; value: string }
	| { op: "check"; target: ElementTarget; value: boolean }
	| { op: "submit"; target: ElementTarget }
	| { op: "read"; target: ElementTarget; as: "text" | "value" | "attr"; attr?: string }
	| { op: "exec"; command: string; timeoutMs?: number };

// ==================== Assert ====================

export type Assertion =
	| TextPresentAssertion
	| UrlMatchesAssertion
	| ElementExistsAssertion
	| HttpResponseAssertion
	| ResponseBodyIncludesAssertion
	| NoErrorsAssertion
	| HasActionAssertion
	| NumericDeltaFromEnvAssertion;

export interface TextPresentAssertion {
	kind: "textPresent";
	/** Case-insensitive substring match in visible page text. */
	value: string;
}

export interface UrlMatchesAssertion {
	kind: "urlMatches";
	/** Regex source (no slashes, no flags). */
	pattern: string;
}

export interface ElementExistsAssertion {
	kind: "elementExists";
	target: ElementTarget;
}

export interface HttpResponseAssertion {
	kind: "httpResponse";
	url?: string;
	status?: number;
	durationUnder?: number;
}

export interface ResponseBodyIncludesAssertion {
	kind: "responseBodyIncludes";
	value: string;
}

export interface NoErrorsAssertion {
	kind: "noErrors";
}

export interface HasActionAssertion {
	kind: "hasAction";
	id: string;
}

export interface NumericDeltaFromEnvAssertion {
	kind: "numericDeltaFromEnv";
	key: string;
	threshold: number;
}

// ==================== Loop ====================

export interface Loop {
	/** Max number of iterations. Default 1. */
	maxIterations?: number;
	/** Stop immediately on an assertion failure. Default: true if maxIterations=1, else false. */
	stopOnFailure?: boolean;
	budget?: {
		timeMs?: number;
		tokens?: number;
	};
}

// ==================== Risk ====================

export type Risk = "low" | "medium" | "high";

// ==================== Provenance ====================

export interface Provenance {
	synthesizedAt?: string;
	synthesizer?: {
		name: string;
		model?: string;
		promptHash?: string;
	};
	author?: {
		name: string;
		email?: string;
	};
}

// ==================== The Spec ====================

export interface ProofSpec {
	version: "v0";
	target: Target;

	name: string;
	description: string;

	inputSchema: {
		type: "object";
		properties: Record<string, unknown>;
		required?: readonly string[];
	};

	observe?: readonly Observation[];
	act?: readonly DslOp[];
	assert?: readonly Assertion[];

	loop?: Loop;

	risk: Risk;

	provenance?: Provenance;
}

// ==================== Runtime result types ====================

export type Status = "pass" | "fail" | "inconclusive";

export interface ObservationResult {
	kind: Observation["kind"];
	ok: boolean;
	detail?: string | undefined;
	durationMs: number;
}

export interface ActionResult {
	op: DslOp["op"];
	ok: boolean;
	error?: string | undefined;
	readValue?: string | undefined;
	durationMs: number;
}

export interface AssertionResult {
	kind: Assertion["kind"];
	ok: boolean;
	detail?: string | undefined;
}

export interface EvidenceBundle {
	status: Status;
	iterations: number;
	observations: readonly ObservationResult[];
	actions: readonly ActionResult[];
	assertions: readonly AssertionResult[];
	/** MCP-shaped content (for invoke() usage). */
	content?: readonly { type: "text"; text: string }[] | undefined;
	errors: readonly string[];
}

// ==================== Runner interface ====================

/**
 * What runners (unsurf-daemon, unsurf-worker, gateproof) must implement to be
 * proof-spec-compatible. Each method is optional; implementers declare what they
 * support via the capabilities flag.
 */
export interface ProofRunner {
	readonly capabilities: ReadonlySet<"dom" | "http" | "exec">;

	invoke(spec: ProofSpec, args: Record<string, unknown>): Promise<EvidenceBundle>;
	verify(spec: ProofSpec, args?: Record<string, unknown>): Promise<EvidenceBundle>;
	runLoop(spec: ProofSpec, args: Record<string, unknown>): Promise<EvidenceBundle>;
}

// ==================== Deterministic risk labeler (shared) ====================

/**
 * Re-implementation of src/services/RiskLabeler.ts's computeRisk, typed against
 * proof-spec's DslOp. Runners MUST call this on every spec before running act[].
 */
const DESTRUCTIVE_RE =
	/\b(delete|remove|pay|buy|send|confirm|destroy|cancel|wipe|exfiltrate|purge|erase|trash|charge|deactivate|uninstall)\b/i;

export function computeRisk(act: readonly DslOp[] | undefined): Risk {
	if (!act || act.length === 0) return "low";
	if (act.every((op) => op.op === "read")) return "low";
	for (const op of act) {
		if (op.op === "submit") return "high";
		if (op.op === "click" && DESTRUCTIVE_RE.test(op.target.name)) return "high";
	}
	return "medium";
}

// ==================== Interop with gateproof's PlanDefinition ====================

// NOTE: these helpers translate between gateproof's existing PlanDefinition
// shape (one plan with N goals, each containing a GateDefinition) and the
// proof-spec shape (one spec per tool/gate). They're best-effort: gateproof's
// scope constraints and cleanup actions don't have direct proof-spec
// equivalents yet. Those stay on the gateproof side until proof-spec v1.

import type {
	ActionDefinition,
	AssertionDefinition,
	GateDefinition,
	ObserveResourceDefinition,
	PlanDefinition,
	PlanGoal,
} from "./index.js";

/**
 * Convert one gateproof PlanGoal into a ProofSpec.
 * Useful when you have a plan.ts and want to emit/publish its goals as
 * proof-spec.v0.json for an external consumer (e.g. unsurf's Directory).
 */
export function goalToProofSpec(goal: PlanGoal, target: Target): ProofSpec {
	const gate = goal.gate;
	const observe: Observation[] = [];
	if (gate.observe) observe.push(...observeResourceToObservations(gate.observe));
	const act: DslOp[] = (gate.act ?? []).map(actionDefinitionToDslOp);
	const assert: Assertion[] = (gate.assert ?? [])
		.map(assertionDefinitionToAssertion)
		.filter((a): a is Assertion => a !== null);

	return {
		version: "v0",
		target,
		name: goal.id,
		description: goal.title,
		inputSchema: { type: "object", properties: {}, required: [] },
		observe,
		act,
		assert,
		risk: computeRisk(act),
	};
}

/**
 * Convert a whole PlanDefinition into an array of ProofSpecs (one per goal).
 * Loop semantics are preserved at the first-goal level.
 */
export function planToProofSpecs(
	plan: PlanDefinition,
	targetFor: (goalId: string) => Target,
): ProofSpec[] {
	return plan.goals.map((g, i) => {
		const spec = goalToProofSpec(g, targetFor(g.id));
		// Only the first goal carries the plan's loop; downstream goals run once each.
		if (i === 0 && plan.loop) {
			const loop: Loop = { maxIterations: plan.loop.maxIterations ?? 1 };
			if (plan.loop.stopOnFailure !== undefined) loop.stopOnFailure = plan.loop.stopOnFailure;
			return { ...spec, loop };
		}
		return spec;
	});
}

function observeResourceToObservations(
	resource: ObserveResourceDefinition,
): Observation[] {
	if (resource.kind === "http") {
		const obs: Observation = {
			kind: "http",
			url: resource.url,
		};
		return [obs];
	}
	// Cloudflare observe kinds stay gateproof-native for now — proof-spec v0
	// doesn't model them. Round-trip marker so the reverse conversion preserves it.
	return [
		{
			kind: "note",
			source: `gateproof:${resource.kind}`,
			field: JSON.stringify(resource),
		},
	];
}

function actionDefinitionToDslOp(action: ActionDefinition): DslOp {
	// gateproof's only ActionDefinition kind today is "exec"
	return {
		op: "exec",
		command: action.command,
	};
}

function assertionDefinitionToAssertion(
	assertion: AssertionDefinition,
): Assertion | null {
	switch (assertion.kind) {
		case "httpResponse":
			return { kind: "httpResponse", status: assertion.status };
		case "responseBodyIncludes":
			// gateproof uses `text`, proof-spec uses `value`
			return { kind: "responseBodyIncludes", value: assertion.text };
		case "noErrors":
			return { kind: "noErrors" };
		case "hasAction":
			// gateproof uses `action`, proof-spec uses `id`
			return { kind: "hasAction", id: assertion.action };
		case "numericDeltaFromEnv":
			// gateproof has a richer numericDelta shape; proof-spec v0 captures
			// the baseline env var + threshold. Pattern/source round-trip as a note.
			return {
				kind: "numericDeltaFromEnv",
				key: assertion.baselineEnv,
				threshold: assertion.minimumDelta,
			};
		// "duration" — gateproof-specific, no proof-spec equivalent yet
		default:
			return null;
	}
}

/**
 * Reverse conversion: a ProofSpec → a gateproof PlanGoal.
 * Use this when you've scouted a tool via unsurf and want to author/test it
 * inside a gateproof plan.ts. Best-effort; not every proof-spec assertion
 * has a gateproof equivalent.
 */
export function proofSpecToGoal(spec: ProofSpec): PlanGoal {
	const gate: GateDefinition = {};
	// For the observe side, pick the first http resource if any
	const firstHttp = spec.observe?.find((o) => o.kind === "http");
	if (firstHttp) {
		(gate as { observe?: ObserveResourceDefinition }).observe = {
			kind: "http",
			url: firstHttp.url,
		};
	}
	// Map act: only exec ops have a gateproof equivalent
	const execActs = (spec.act ?? []).filter((op) => op.op === "exec");
	if (execActs.length > 0) {
		gate.act = execActs.map((op) => ({
			kind: "exec" as const,
			command: (op as Extract<DslOp, { op: "exec" }>).command,
		}));
	}
	// Map assertions we can. DOM-layer assertions (textPresent, urlMatches,
	// elementExists) have no gateproof equivalent — skipped silently.
	const gateAsserts: AssertionDefinition[] = [];
	for (const a of spec.assert ?? []) {
		if (a.kind === "httpResponse") {
			// gateproof requires `status`; proof-spec makes it optional. Skip if missing.
			if (a.status !== undefined) {
				gateAsserts.push({ kind: "httpResponse", status: a.status });
			}
		} else if (a.kind === "responseBodyIncludes") {
			gateAsserts.push({ kind: "responseBodyIncludes", text: a.value });
		} else if (a.kind === "noErrors") {
			gateAsserts.push({ kind: "noErrors" });
		} else if (a.kind === "hasAction") {
			gateAsserts.push({ kind: "hasAction", action: a.id });
		} else if (a.kind === "numericDeltaFromEnv") {
			// proof-spec's numericDeltaFromEnv is thinner than gateproof's.
			// Fill in sensible defaults for source/pattern; consumers can replace.
			gateAsserts.push({
				kind: "numericDeltaFromEnv",
				source: "httpBody",
				pattern: "\\d+",
				baselineEnv: a.key,
				minimumDelta: a.threshold,
			});
		}
	}
	if (gateAsserts.length > 0) gate.assert = gateAsserts;

	return {
		id: spec.name,
		title: spec.description,
		gate,
	};
}
