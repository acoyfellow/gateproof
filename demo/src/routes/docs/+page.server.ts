import { renderMarkdown } from '$lib/markdown';

const docs = import.meta.glob('$docs/**/*.md', { query: '?raw', import: 'default', eager: true });

export async function load() {
	const source = docs['/docs/explanations/overview.md'] as string;
	if (!source) {
		// Fallback: try alternate key formats
		const key = Object.keys(docs).find((k) => k.includes('explanations/overview'));
		const content = key ? (docs[key] as string) : '# Documentation\n\nWelcome to the gateproof docs.';
		const { html, toc } = await renderMarkdown(content);
		return { html, toc, slug: 'explanations/overview' };
	}
	const { html, toc } = await renderMarkdown(source);
	return { html, toc, slug: 'explanations/overview' };
}
