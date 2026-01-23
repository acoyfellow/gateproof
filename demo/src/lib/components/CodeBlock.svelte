<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  interface Props {
    code: string;
    language?: string;
    wrap?: boolean;
  }

  let { code, language = 'typescript', wrap = false }: Props = $props();
  
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

<div class="text-xs font-mono leading-relaxed min-w-0 w-full" class:wrap>
  {#if loading}
    <pre class="text-gray-100 whitespace-pre overflow-x-auto sm:whitespace-pre sm:overflow-x-auto" class:pre-wrap={wrap} class:overflow-x-hidden={wrap}>
      <code>{code}</code>
    </pre>
  {:else}
    {@html highlightedHtml}
  {/if}
</div>

<style>
  .wrap :global(.shiki),
  .wrap :global(.shiki pre) {
    overflow-x: hidden !important;
  }

  .wrap :global(.shiki code) {
    white-space: pre-wrap !important;
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
  }

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

  @media (max-width: 640px) {
    :global(.shiki code) {
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: break-word;
    }
  }
</style>
