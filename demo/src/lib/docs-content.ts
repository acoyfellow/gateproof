const docFiles = import.meta.glob('./docs/**/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const docsPrefix = './docs/';
const markdownSuffix = '.md';

const toSlug = (path: string): string =>
	path.slice(docsPrefix.length, path.length - markdownSuffix.length);

export const docsContent: Record<string, string> = Object.fromEntries(
	Object.entries(docFiles).map(([path, source]) => [toSlug(path), source])
);
