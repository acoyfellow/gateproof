<script lang="ts">
	import type { TocEntry } from '$lib/markdown';
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

<div class="docs-page">
	<div class="docs-content">
		<div class="docs-prose">
			{@html data.html}
		</div>

		{#if navLinks.prev || navLinks.next}
			<nav class="docs-prev-next">
				{#if navLinks.prev}
					<a href="/docs/{navLinks.prev.slug}" class="docs-prev-next-link prev">
						<span class="docs-prev-next-label">Previous</span>
						<span class="docs-prev-next-title">{navLinks.prev.title}</span>
					</a>
				{:else}
					<div></div>
				{/if}
				{#if navLinks.next}
					<a href="/docs/{navLinks.next.slug}" class="docs-prev-next-link next">
						<span class="docs-prev-next-label">Next</span>
						<span class="docs-prev-next-title">{navLinks.next.title}</span>
					</a>
				{/if}
			</nav>
		{/if}
	</div>

	{#if data.toc.length > 0}
		<aside class="docs-toc">
			<div class="docs-toc-label">On this page</div>
			{#each data.toc as entry}
				<a
					href="#{entry.id}"
					class="docs-toc-link"
					class:indent={entry.level === 3}
				>
					{entry.text}
				</a>
			{/each}
		</aside>
	{/if}
</div>
