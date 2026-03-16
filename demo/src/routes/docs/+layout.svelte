<script lang="ts">
	import { page } from '$app/state';
	import type { DocCategory } from '$lib/docs-manifest';
	import type { Snippet } from 'svelte';

	interface Props {
		data: { nav: DocCategory[] };
		children: Snippet;
	}

	let { data, children }: Props = $props();
	let sidebarOpen = $state(false);

	function currentSlug(): string {
		const path = page.url.pathname;
		if (path === '/docs' || path === '/docs/') return 'index';
		const prefix = '/docs/';
		return path.startsWith(prefix) ? path.slice(prefix.length).replace(/\/$/, '') : '';
	}

	function isActive(slug: string): boolean {
		const current = currentSlug();
		if (!current && slug === 'index') return true;
		return current === slug;
	}

	function currentTitle(): string {
		const slug = currentSlug();
		if (!slug || slug === 'index') return 'Documentation';
		for (const cat of data.nav) {
			const entry = cat.entries.find((e) => e.slug === slug);
			if (entry) return entry.title;
		}
		return slug.split('/').pop()?.replace(/-/g, ' ') ?? 'Docs';
	}
</script>

<div class="flex min-h-screen flex-col bg-background max-w-6xl mx-auto">
	<nav class="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 pl-6">
		<div class="flex items-center gap-2 font-(family-name:--font-body) text-[0.8125rem]">
			<a href="/docs" class="text-muted-foreground no-underline hover:text-foreground">Docs</a>
			<span class="text-muted-foreground opacity-60" aria-hidden="true">/</span>
			<span class="font-medium text-foreground">{currentTitle()}</span>
		</div>
		<button
			class="cursor-pointer border-none bg-transparent p-1 text-secondary-foreground hover:text-foreground md:hidden"
			onclick={() => (sidebarOpen = !sidebarOpen)}
			aria-label="Toggle sidebar"
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				{#if sidebarOpen}
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				{:else}
					<line x1="3" y1="6" x2="21" y2="6" />
					<line x1="3" y1="12" x2="21" y2="12" />
					<line x1="3" y1="18" x2="21" y2="18" />
				{/if}
			</svg>
		</button>
	</nav>

	{#if sidebarOpen}
		<div
			class="fixed inset-0 z-40 bg-black/50 md:hidden"
			onclick={() => (sidebarOpen = false)}
			role="button"
			tabindex="-1"
			onkeydown={(e) => e.key === 'Escape' && (sidebarOpen = false)}
		></div>
	{/if}

	<div class="relative flex min-h-0 flex-1 md:relative">
		<aside
			class="fixed left-0 top-0 bottom-0 z-50 w-60 -translate-x-full shrink-0 overflow-y-auto border-r border-sidebar-border bg-sidebar py-5 px-3 pb-8 transition-transform duration-200 md:static md:translate-x-0 {sidebarOpen ? 'translate-x-0' : ''}"
		>
			<nav class="flex flex-col gap-5 font-(family-name:--font-body)" aria-label="Docs">
				{#each data.nav as category}
					<div>
						<div class="mb-2 px-2 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
							{category.label}
						</div>
						<ul class="m-0 list-none p-0">
							{#each category.entries as entry}
								<li>
									<a
										href="/docs/{entry.slug}"
										class="block px-2 py-1.5 text-[0.8125rem] no-underline transition-colors {isActive(entry.slug)
											? 'rounded-sm bg-accent/10 text-sidebar-primary'
											: 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'}"
										onclick={() => (sidebarOpen = false)}
									>
										{entry.title}
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</nav>
		</aside>
		<main class="min-w-0 flex-1 overflow-y-auto">
			{@render children()}
		</main>
	</div>
</div>
