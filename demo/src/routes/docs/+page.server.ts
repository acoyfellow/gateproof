import { renderMarkdown } from '$lib/markdown';
import { docsContent } from '$lib/docs-content';

export async function load() {
	const source = docsContent['index'] ?? '# Documentation\n\nWelcome to the gateproof docs.';
	const { html, toc } = await renderMarkdown(source);
	return { html, toc, slug: 'index' };
}
