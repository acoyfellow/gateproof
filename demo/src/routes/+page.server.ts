import type { PageServerLoad } from "./$types";
import { homepageContent, type HomepageContent } from "$lib/homepage-content";
import { renderCodeBlock } from "$lib/server/highlight";

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

export const load: PageServerLoad<HomepageContent> = async () => {
	let snippetHtml: string;
	try {
		snippetHtml = await renderCodeBlock(homepageContent.snippetCode, "typescript");
	} catch {
		snippetHtml = `<pre><code class="language-typescript">${escapeHtml(homepageContent.snippetCode)}</code></pre>`;
	}
	return {
		...homepageContent,
		snippetHtml,
	};
};
