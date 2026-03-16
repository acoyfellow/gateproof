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

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

export async function renderCodeBlock(code: string, language = 'text'): Promise<string> {
	const highlighter = await getHighlighter();
	return renderCodeBlockWithHighlighter(highlighter, code, language);
}

export function renderCodeBlockWithHighlighter(
	highlighter: Highlighter,
	code: string,
	language = 'text'
): string {
	const loadedLangs = new Set(highlighter.getLoadedLanguages().map(String));
	const lang = loadedLangs.has(language) ? language : 'text';

	try {
		return highlighter.codeToHtml(code, {
			lang,
			theme: 'github-dark'
		});
	} catch {
		return `<pre><code class="language-${lang}">${escapeHtml(code)}</code></pre>`;
	}
}
