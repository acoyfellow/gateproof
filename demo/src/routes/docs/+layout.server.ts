import { docsNav } from '$lib/docs-manifest';

export const prerender = true;

export function load() {
	return { nav: docsNav };
}
