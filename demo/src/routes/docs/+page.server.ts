import { renderMarkdown } from '$lib/markdown';
import { docsContent } from '$lib/docs-content';

export async function load() {
	const source = docsContent['tutorials/first-gate'] ?? '# Documentation\n\nWelcome to the gateproof docs.';
	const { html, toc } = await renderMarkdown(source);
	return { html, toc, slug: 'tutorials/first-gate' };
}
