import { error } from '@sveltejs/kit';
import { renderMarkdown } from '$lib/markdown';
import { allDocSlugs } from '$lib/docs-manifest';
import { docsContent } from '$lib/docs-content';

export function entries() {
	return allDocSlugs.map((slug) => ({ slug }));
}

export async function load({ params }) {
	const slug = params.slug;
	const source = docsContent[slug];

	if (!source) {
		error(404, `Doc not found: ${slug}`);
	}

	const { html, toc } = await renderMarkdown(source);
	return { html, toc, slug };
}
