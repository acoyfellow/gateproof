import type { PageServerLoad } from './$types';
import { renderCodeBlock } from '$lib/server/highlight';

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

async function safeRenderCodeBlock(code: string, language: string): Promise<string> {
	try {
		return await renderCodeBlock(code, language);
	} catch {
		return `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`;
	}
}

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
  stories: readonly PlanStory[];
  loop?: {
    maxIterations?: number;
    stopOnFailure?: boolean;
  };
};`
	},
	{
		title: 'PlanStory',
		code: `type PlanStory = {
  id: string;
  title: string;
  gate: GateDefinition;
  scope?: PlanScope;
  dependsOn?: readonly string[];
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
			html: await safeRenderCodeBlock(section.code, 'typescript')
		}))
	)
});
