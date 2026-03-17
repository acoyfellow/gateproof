/**
 * Shiki syntax highlighting with CF Workers compatibility.
 * Uses createJavaScriptRegexEngine (no WASM) and fine-grained imports
 * so it runs on Cloudflare Workers.
 *
 * @see https://shiki.style/guide/install#cloudflare-workers
 * @see https://shiki.style/guide/bundles#fine-grained-bundle
 */
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import githubDark from '@shikijs/themes/github-dark';
import typescript from '@shikijs/langs/typescript';
import javascript from '@shikijs/langs/javascript';
import bash from '@shikijs/langs/bash';
import json from '@shikijs/langs/json';
import yaml from '@shikijs/langs/yaml';
import tsx from '@shikijs/langs/tsx';
import shell from '@shikijs/langs/shell';
import type { HighlighterCore } from 'shiki/core';

let highlighterPromise: Promise<HighlighterCore> | null = null;

export function getHighlighter(): Promise<HighlighterCore> {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighterCore({
			themes: [githubDark],
			langs: [typescript, javascript, bash, json, yaml, tsx, shell],
			engine: createJavaScriptRegexEngine(),
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
	highlighter: HighlighterCore,
	code: string,
	language = 'text'
): string {
	const loadedLangs = new Set(highlighter.getLoadedLanguages().map(String));
	const lang = loadedLangs.has(language) ? language : 'text';

	try {
		return highlighter.codeToHtml(code, {
			lang,
			theme: 'github-dark',
		});
	} catch {
		return `<pre><code class="language-${lang}">${escapeHtml(code)}</code></pre>`;
	}
}
