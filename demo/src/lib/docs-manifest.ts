export interface DocEntry {
	title: string;
	slug: string;
}

export interface DocCategory {
	label: string;
	entries: DocEntry[];
}

const manifest: DocCategory[] = [
	{ label: "Overview", entries: [{ slug: "index", title: "Documentation" }] },
	{ label: "Tutorials", entries: [{ slug: "tutorials/first-gate", title: "Your First Gate" }] },
	{
		label: "How-To Guides",
		entries: [
			{ slug: "how-to/run-in-a-loop", title: "Run in a Loop" },
			{ slug: "how-to/gate-a-lean-proof", title: "Gate a Lean Proof" },
			{ slug: "how-to/use-the-filepath-worker-alpha", title: "Use the filepath Worker Alpha" },
			{ slug: "how-to/add-deja-memory", title: "Add Deja Memory" }
		]
	},
	{ label: "Reference", entries: [{ slug: "reference/api", title: "API Reference" }] },
	{
		label: "Explanations",
		entries: [
			{ slug: "explanations/proof-spec", title: "proof-spec.v0" },
			{ slug: "explanations/case-studies", title: "Case Studies" }
		]
	}
];

export const docsNav: DocCategory[] = manifest;

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
