import { expect, test, describe } from "bun:test";
import {
	computeRisk,
	goalToProofSpec,
	planToProofSpecs,
	proofSpecToGoal,
	type ProofSpec,
} from "../src/index.js";
import { Gate, Plan, Act, Assert, createHttpObserveResource } from "../src/index.js";
import type { PlanGoal } from "../src/index.js";

describe("proof-spec interop", () => {
	test("computeRisk reads DslOp shape correctly", () => {
		expect(computeRisk([])).toBe("low");
		expect(computeRisk([{ op: "read", target: { role: "heading", name: "x" }, as: "text" }])).toBe(
			"low",
		);
		expect(computeRisk([{ op: "fill", target: { role: "textbox", name: "x" }, value: "y" }])).toBe(
			"medium",
		);
		expect(computeRisk([{ op: "submit", target: { role: "form", name: "x" } }])).toBe("high");
		expect(computeRisk([{ op: "click", target: { role: "button", name: "Delete" } }])).toBe(
			"high",
		);
		// word-boundary: "Cancellation policy" is NOT destructive
		expect(computeRisk([{ op: "click", target: { role: "link", name: "Cancellation policy" } }])).toBe(
			"medium",
		);
	});

	test("goalToProofSpec converts a gateproof goal into a proof-spec", () => {
		const goal: PlanGoal = {
			id: "hello_world",
			title: "GET / returns hello world",
			gate: Gate.define({
				observe: createHttpObserveResource({ url: "http://localhost:3000/" }),
				act: [Act.exec("curl -sf http://localhost:3000/")],
				assert: [
					Assert.httpResponse({ status: 200 }),
					Assert.responseBodyIncludes("hello world"),
					Assert.noErrors(),
				],
			}),
		};

		const spec = goalToProofSpec(goal, { url: "http://localhost:3000/" });

		expect(spec.version).toBe("v0");
		expect(spec.name).toBe("hello_world");
		expect(spec.description).toBe("GET / returns hello world");
		expect(spec.target.url).toBe("http://localhost:3000/");

		// observe translated
		expect(spec.observe).toBeDefined();
		expect(spec.observe?.length).toBe(1);
		expect(spec.observe?.[0]?.kind).toBe("http");

		// act translated
		expect(spec.act?.length).toBe(1);
		expect(spec.act?.[0]?.op).toBe("exec");

		// assert translated
		expect(spec.assert?.length).toBe(3);
		expect(spec.assert?.map((a) => a.kind)).toEqual([
			"httpResponse",
			"responseBodyIncludes",
			"noErrors",
		]);

		// risk computed from act, not claimed. exec is interactive but not destructive → medium.
		expect(spec.risk).toBe("medium");
	});

	test("planToProofSpecs preserves loop on the first goal only", () => {
		const plan = Plan.define({
			goals: [
				{
					id: "goal_one",
					title: "First goal",
					gate: Gate.define({
						observe: createHttpObserveResource({ url: "http://x/" }),
						assert: [Assert.httpResponse({ status: 200 })],
					}),
				},
				{
					id: "goal_two",
					title: "Second goal",
					gate: Gate.define({ assert: [Assert.noErrors()] }),
				},
			],
			loop: { maxIterations: 5, stopOnFailure: true },
		});
		const specs = planToProofSpecs(plan, (id) => ({ url: `http://${id}/` }));
		expect(specs).toHaveLength(2);
		expect(specs[0]?.loop?.maxIterations).toBe(5);
		expect(specs[0]?.loop?.stopOnFailure).toBe(true);
		expect(specs[1]?.loop).toBeUndefined();
	});

	test("round-trip: goal → proof-spec → goal preserves core shape", () => {
		const original: PlanGoal = {
			id: "round_trip",
			title: "Round-trip test",
			gate: Gate.define({
				observe: createHttpObserveResource({ url: "https://example.com/" }),
				act: [Act.exec("curl https://example.com/")],
				assert: [
					Assert.httpResponse({ status: 200 }),
					Assert.responseBodyIncludes("Example"),
				],
			}),
		};

		const spec = goalToProofSpec(original, { url: "https://example.com/" });
		const roundTripped = proofSpecToGoal(spec);

		expect(roundTripped.id).toBe(original.id);
		expect(roundTripped.title).toBe(original.title);
		expect(roundTripped.gate.act?.length).toBe(1);
		expect(roundTripped.gate.act?.[0]?.kind).toBe("exec");
		// HTTP observe survives
		expect(roundTripped.gate.observe).toBeDefined();
		// 2 assertions survive the round-trip (httpResponse + responseBodyIncludes)
		expect(roundTripped.gate.assert?.length).toBe(2);
	});

	test("proof-spec DOM-layer assertions don't round-trip into gateproof", () => {
		const spec: ProofSpec = {
			version: "v0",
			target: { url: "https://example.com/" },
			name: "dom_heavy",
			description: "assertions that have no gateproof equivalent",
			inputSchema: { type: "object", properties: {}, required: [] },
			assert: [
				{ kind: "textPresent", value: "Hello" },
				{ kind: "elementExists", target: { role: "heading", name: "H1" } },
				{ kind: "httpResponse", status: 200 },
			],
			risk: "low",
		};
		const goal = proofSpecToGoal(spec);
		// DOM-layer assertions skipped; only httpResponse survives
		expect(goal.gate.assert?.length).toBe(1);
		expect(goal.gate.assert?.[0]?.kind).toBe("httpResponse");
	});
});
