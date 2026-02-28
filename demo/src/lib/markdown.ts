import { marked } from 'marked';
import { createHighlighter, type Highlighter } from 'shiki';

export interface TocEntry {
	id: string;
	text: string;
	level: number;
}

export interface RenderResult {
	html: string;
	toc: TocEntry[];
}

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

/**
 * Render markdown to HTML with syntax highlighting, heading IDs, and TOC extraction.
 * Designed for build-time / server-side use.
 */
export async function renderMarkdown(source: string): Promise<RenderResult> {
	const highlighter = await getHighlighter();
	const toc: TocEntry[] = [];

	const renderer = new marked.Renderer();

	// Add IDs to headings and collect TOC
	renderer.heading = ({ text, depth }: { text: string; depth: number }) => {
		const id = slugify(text);
		if (depth === 2 || depth === 3) {
			toc.push({ id, text, level: depth });
		}
		return `<h${depth} id="${id}">${text}</h${depth}>`;
	};

	// Syntax-highlighted code blocks
	renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
		const language = lang || 'text';
		try {
			const loadedLangs = highlighter.getLoadedLanguages();
			if (loadedLangs.includes(language as any)) {
				return highlighter.codeToHtml(text, { lang: language, theme: 'github-dark' });
			}
		} catch {
			// fall through to plain
		}
		return `<pre><code class="language-${language}">${text}</code></pre>`;
	};

	renderer.link = ({ href, text }: { href: string; text: string }) => {
		return `<a href="${href}">${text}</a>`;
	};

	const html = await marked.parse(source, { renderer });

	return { html, toc };
}
