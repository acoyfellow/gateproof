import type { PageServerLoad } from './$types';
import { renderCodeBlock } from '$lib/server/highlight';

const sections = [
	{
		title: 'ScopeFile',
		code: `type ScopeFile = {
  spec: SpecDefinition;
  plan: PlanDefinition;
};`
	},
	{
		title: 'SpecDefinition',
		code: `type SpecDefinition = {
  title: string;
  tutorial: { goal: string; outcome: string };
  howTo: { task: string; done: string };
  explanation: { summary: string };
};`
	},
	{
		title: 'PlanDefinition',
		code: `type PlanDefinition = {
  goals: readonly PlanGoal[];
  loop?: {
    maxIterations?: number;
    stopOnFailure?: boolean;
  };
};`
	},
	{
		title: 'PlanGoal',
		code: `type PlanGoal = {
  id: string;
  title: string;
  gate: GateDefinition;
};`
	},
	{
		title: 'GateStatus',
		code: `type VerificationResult = {
  status: "pass" | "fail" | "skip" | "inconclusive";
  proofStrength: "strong" | "moderate" | "weak" | "none";
};`
	}
] as const;

export const load: PageServerLoad = async () => ({
	sections: await Promise.all(
		sections.map(async (section) => ({
			...section,
			html: await renderCodeBlock(section.code, 'typescript')
		}))
	)
});
