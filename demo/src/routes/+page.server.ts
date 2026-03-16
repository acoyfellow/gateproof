import type { PageServerLoad } from "./$types";
import { homepageContent, type HomepageContent } from "$lib/homepage-content";
import { renderCodeBlock } from "$lib/server/highlight";

export const load: PageServerLoad<HomepageContent> = async () => ({
	...homepageContent,
	snippetHtml: await renderCodeBlock(homepageContent.snippetCode, "typescript")
});
