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

<div class="text-xs font-mono leading-relaxed min-w-0">
  {#if loading}
    <pre class="text-gray-100 whitespace-pre overflow-x-auto"><code>{code}</code></pre>
  {:else}
    {@html highlightedHtml}
  {/if}
</div>

<style>
  :global(.shiki) {
    background: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
    min-width: 0;
    overflow-x: auto;
  }
  
  :global(.shiki code) {
    font-size: 0.75rem;
    line-height: 1.5;
    white-space: pre;
    word-break: normal;
    overflow-wrap: normal;
  }
  
  :global(.shiki pre) {
    overflow-x: auto;
    min-width: 0;
  }
</style>
