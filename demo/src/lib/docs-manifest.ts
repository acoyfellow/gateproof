export interface DocEntry {
	title: string;
	slug: string;
}

export interface DocCategory {
	label: string;
	entries: DocEntry[];
}

export const docsNav: DocCategory[] = [
	{
		label: 'Tutorials',
		entries: [{ title: 'Your First Gate', slug: 'tutorials/first-gate' }]
	},
	{
		label: 'How-To Guides',
		entries: [
			{ title: 'Add a Gate', slug: 'how-to/add-a-gate' },
			{ title: 'Add Observability Logging', slug: 'how-to/add-observability-logging' },
			{ title: 'Use Shorthands', slug: 'how-to/use-shorthands' },
			{ title: 'Accessibility', slug: 'how-to/accessibility' },
			{ title: 'Run in CI', slug: 'how-to/run-in-ci' },
			{ title: 'Run in a Loop', slug: 'how-to/run-in-a-loop' },
			{ title: 'Write a PRD Story', slug: 'how-to/write-a-prd-story' },
			{ title: 'Run an Agent Gate', slug: 'how-to/run-an-agent-gate' }
		]
	},
	{
		label: 'Reference',
		entries: [
			{ title: 'API Reference', slug: 'reference/api' },
			{ title: 'PRD Runner', slug: 'reference/prd-runner' }
		]
	},
	{
		label: 'Explanations',
		entries: [
			{ title: 'How Gateproof Works', slug: 'explanations/overview' },
			{ title: 'Effect and Schema', slug: 'effect-and-schema' }
		]
	}
];

/** Flat list of all doc slugs for prerender discovery */
export const allDocSlugs: string[] = docsNav.flatMap((cat) => cat.entries.map((e) => e.slug));

/** Find prev/next entries for navigation */
export function getPrevNext(slug: string): { prev: DocEntry | null; next: DocEntry | null } {
	const flat = docsNav.flatMap((cat) => cat.entries);
	const idx = flat.findIndex((e) => e.slug === slug);
	return {
		prev: idx > 0 ? flat[idx - 1] : null,
		next: idx < flat.length - 1 ? flat[idx + 1] : null
	};
}
