<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  interface Props {
    code: string;
    language?: string;
  }

  let { code, language = 'typescript' }: Props = $props();
  
  let highlightedHtml = $state<string>('');
  let loading = $state(true);

  onMount(async () => {
    if (!browser) {
      loading = false;
      highlightedHtml = `<pre><code>${code}</code></pre>`;
      return;
    }

    try {
      const { codeToHtml } = await import('shiki');
      highlightedHtml = await codeToHtml(code, {
        lang: language,
        theme: 'github-dark'
      });
    } catch (error) {
      console.error('Failed to highlight code:', error);
      highlightedHtml = `<pre><code>${code}</code></pre>`;
    } finally {
      loading = false;
    }
  });
</script>

<div class="text-xs font-mono leading-relaxed">
  {#if loading}
    <pre class="text-gray-100 whitespace-pre"><code>{code}</code></pre>
  {:else}
    {@html highlightedHtml}
  {/if}
</div>

<style>
  :global(.shiki) {
    background: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  
  :global(.shiki code) {
    font-size: 0.75rem;
    line-height: 1.5;
  }
</style>
