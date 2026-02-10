<script lang="ts">
	import { page } from '$app/state';
	import type { DocCategory, DocEntry } from '$lib/docs-manifest';
	import type { TocEntry } from '$lib/markdown';
	import type { Snippet } from 'svelte';

	interface Props {
		data: { nav: DocCategory[] };
		children: Snippet;
	}

	let { data, children }: Props = $props();
	let sidebarOpen = $state(false);

	function currentSlug(): string {
		const path = page.url.pathname;
		const prefix = '/docs/';
		return path.startsWith(prefix) ? path.slice(prefix.length) : '';
	}

	function isActive(slug: string): boolean {
		const current = currentSlug();
		// Index page: slug is empty, match 'explanations/overview' or empty
		if (!current && slug === 'explanations/overview') return true;
		return current === slug;
	}
</script>

<div class="docs-layout">
	<!-- Mobile header -->
	<div class="docs-mobile-header">
		<button
			class="docs-hamburger"
			onclick={() => (sidebarOpen = !sidebarOpen)}
			aria-label="Toggle navigation"
		>
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
		<a href="/docs" class="docs-mobile-title">Docs</a>
		<a href="/" class="docs-home-link">gateproof</a>
	</div>

	<!-- Sidebar -->
	<aside class="docs-sidebar" class:open={sidebarOpen}>
		<div class="docs-sidebar-inner">
			<a href="/" class="docs-logo">
				<span class="docs-logo-accent">gate</span>proof
			</a>
			<nav class="docs-nav">
				{#each data.nav as category}
					<div class="docs-nav-category">
						<div class="docs-nav-category-label">{category.label}</div>
						{#each category.entries as entry}
							<a
								href="/docs/{entry.slug}"
								class="docs-nav-link"
								class:active={isActive(entry.slug)}
								onclick={() => (sidebarOpen = false)}
							>
								{entry.title}
							</a>
						{/each}
					</div>
				{/each}
			</nav>
		</div>
	</aside>

	<!-- Backdrop for mobile -->
	{#if sidebarOpen}
		<div
			class="docs-backdrop"
			onclick={() => (sidebarOpen = false)}
			role="button"
			tabindex="-1"
			onkeydown={(e) => e.key === 'Escape' && (sidebarOpen = false)}
		></div>
	{/if}

	<!-- Content area -->
	<main class="docs-main">
		{@render children()}
	</main>
</div>

<style>
	.docs-layout {
		display: flex;
		min-height: 100vh;
		background: var(--color-background);
	}

	/* Mobile header */
	.docs-mobile-header {
		display: none;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 3rem;
		background: var(--card);
		border-bottom: 1px solid var(--border);
		align-items: center;
		padding: 0 1rem;
		z-index: 40;
		gap: 0.75rem;
	}

	.docs-hamburger {
		color: var(--secondary-foreground);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
	}

	.docs-hamburger:hover {
		color: var(--foreground);
	}

	.docs-mobile-title {
		font-family: var(--font-body);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--foreground);
		text-decoration: none;
	}

	.docs-home-link {
		margin-left: auto;
		font-family: var(--font-body);
		font-size: 0.75rem;
		color: var(--muted-foreground);
		text-decoration: none;
	}

	.docs-home-link:hover {
		color: var(--accent);
	}

	/* Sidebar */
	.docs-sidebar {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		width: 16rem;
		background: var(--card);
		border-right: 1px solid var(--border);
		overflow-y: auto;
		z-index: 30;
	}

	.docs-sidebar-inner {
		padding: 1.5rem 1rem 2rem;
	}

	.docs-logo {
		display: block;
		font-family: var(--font-body);
		font-size: 1rem;
		font-weight: 500;
		color: var(--foreground);
		text-decoration: none;
		margin-bottom: 2rem;
		padding: 0 0.5rem;
	}

	.docs-logo-accent {
		color: var(--accent);
	}

	.docs-nav {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.docs-nav-category-label {
		font-family: var(--font-body);
		font-size: 0.6875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--muted-foreground);
		padding: 0 0.5rem;
		margin-bottom: 0.375rem;
	}

	.docs-nav-link {
		display: block;
		font-family: var(--font-body);
		font-size: 0.8125rem;
		color: var(--secondary-foreground);
		text-decoration: none;
		padding: 0.3rem 0.5rem;
		border-radius: 0.25rem;
		transition: color 0.15s, background 0.15s;
	}

	.docs-nav-link:hover {
		color: var(--foreground);
		background: var(--muted);
	}

	.docs-nav-link.active {
		color: var(--accent);
		background: oklch(0.75 0.22 38 / 0.1);
	}

	.docs-backdrop {
		display: none;
	}

	/* Content */
	.docs-main {
		flex: 1;
		margin-left: 16rem;
		min-width: 0;
	}

	/* Mobile */
	@media (max-width: 768px) {
		.docs-mobile-header {
			display: flex;
		}

		.docs-sidebar {
			transform: translateX(-100%);
			transition: transform 0.25s ease;
			z-index: 50;
		}

		.docs-sidebar.open {
			transform: translateX(0);
		}

		.docs-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			background: black/60;
			z-index: 45;
		}

		.docs-main {
			margin-left: 0;
			padding-top: 3rem;
		}
	}
</style>
