import { marked } from 'marked';
import type { RenderResult, TocEntry } from '$lib/markdown-types';
import { renderCodeBlockWithHighlighter } from './highlight';
import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighter({
			themes: ['github-dark'],
			langs: ['typescript', 'javascript', 'bash', 'json', 'yaml', 'tsx', 'text', 'shell']
		});
	}
	return highlighterPromise;
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.trim();
}

export async function renderMarkdown(source: string): Promise<RenderResult> {
	const highlighter = await getHighlighter();
	const toc: TocEntry[] = [];

	const renderer = new marked.Renderer();

	renderer.heading = ({ text, depth }: { text: string; depth: number }) => {
		const id = slugify(text);
		if (depth === 2 || depth === 3) {
			toc.push({ id, text, level: depth });
		}
		return `<h${depth} id="${id}">${text}</h${depth}>`;
	};

	renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
		const language = lang || 'text';
		return renderCodeBlockWithHighlighter(highlighter, text, language);
	};

	renderer.link = ({ href, text }: { href: string; text: string }) => {
		return `<a href="${href}">${text}</a>`;
	};

	const html = await marked.parse(source, { renderer });

	return { html, toc };
}
