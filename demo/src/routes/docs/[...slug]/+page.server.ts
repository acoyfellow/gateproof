import { error } from '@sveltejs/kit';
import { renderMarkdown } from '$lib/markdown';
import { allDocSlugs } from '$lib/docs-manifest';

const docs = import.meta.glob('$docs/**/*.md', { query: '?raw', import: 'default', eager: true });

export function entries() {
	return allDocSlugs.map((slug) => ({ slug }));
}

function findDoc(slug: string): string | undefined {
	// Try common key patterns that Vite may use for the $docs alias
	for (const key of Object.keys(docs)) {
		// Key might be like "$docs/how-to/add-a-gate.md" or "/docs/how-to/add-a-gate.md"
		if (key.endsWith(`/${slug}.md`)) {
			return docs[key] as string;
		}
	}
	return undefined;
}

export async function load({ params }) {
	const slug = params.slug;
	const source = findDoc(slug);

	if (!source) {
		error(404, `Doc not found: ${slug}`);
	}

	const { html, toc } = await renderMarkdown(source);
	return { html, toc, slug };
}
