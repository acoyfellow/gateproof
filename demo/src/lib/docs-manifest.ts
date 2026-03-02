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
		entries: [{ title: 'Run in a Loop', slug: 'how-to/run-in-a-loop' }]
	},
	{
		label: 'Reference',
		entries: [{ title: 'API Reference', slug: 'reference/api' }]
	},
	{
		label: 'Explanations',
		entries: [{ title: 'One File Handoff', slug: 'explanations/one-file-handoff' }]
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
