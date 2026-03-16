<script lang="ts">
	import type { TocEntry } from '$lib/markdown-types';
	import { getPrevNext } from '$lib/docs-manifest';

	interface Props {
		data: { html: string; toc: TocEntry[]; slug: string };
	}

	let { data }: Props = $props();

	const navLinks = $derived(getPrevNext(data.slug));
</script>

<svelte:head>
	<title>{data.slug.split('/').pop()?.replace(/-/g, ' ')} - gateproof docs</title>
</svelte:head>

<div class="flex gap-8 max-w-6xl mx-auto py-10 px-8 max-md:px-4 max-md:py-6">
	<div class="flex-1 min-w-0 max-w-3xl">
		<div class="docs-prose">
			{@html data.html}
		</div>

		{#if navLinks.prev || navLinks.next}
			<nav class="flex justify-between gap-4 mt-12 pt-6 border-t border-border">
				{#if navLinks.prev}
					<a
						href="/docs/{navLinks.prev.slug}"
						class="flex flex-col gap-1 no-underline p-3 border border-border rounded-lg transition-colors hover:border-accent max-w-[50%]"
					>
						<span class="font-(family-name:--font-body) text-[0.6875rem] uppercase tracking-wider text-muted-foreground">Previous</span>
						<span class="font-(family-name:--font-body) text-sm text-accent">{navLinks.prev.title}</span>
					</a>
				{:else}
					<div></div>
				{/if}
				{#if navLinks.next}
					<a
						href="/docs/{navLinks.next.slug}"
						class="flex flex-col gap-1 no-underline p-3 border border-border rounded-lg transition-colors hover:border-accent max-w-[50%] ml-auto text-right"
					>
						<span class="font-(family-name:--font-body) text-[0.6875rem] uppercase tracking-wider text-muted-foreground">Next</span>
						<span class="font-(family-name:--font-body) text-sm text-accent">{navLinks.next.title}</span>
					</a>
				{/if}
			</nav>
		{/if}
	</div>

	{#if data.toc.length > 0}
		<aside class="sticky top-8 w-56 shrink-0 max-h-[calc(100vh-4rem)] overflow-y-auto pt-2 max-lg:hidden">
			<div class="font-(family-name:--font-body) text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground mb-3">On this page</div>
			{#each data.toc as entry}
				<a
					href="#{entry.id}"
					class="block font-(family-name:--font-body) text-xs text-secondary-foreground no-underline py-0.5 pl-3 border-l-2 border-transparent transition-colors hover:text-foreground hover:border-accent {entry.level === 3 ? 'pl-6' : ''}"
				>
					{entry.text}
				</a>
			{/each}
		</aside>
	{/if}
</div>
