<script lang="ts">
  interface Props {
    code: string;
    html?: string;
    language?: string;
    wrap?: boolean;
  }

  let { code, html, language = 'typescript', wrap = false }: Props = $props();
</script>

<div class="wrap text-xs font-mono leading-relaxed min-w-0 w-full" class:wrap data-language={language}>
  {#if html}
    {@html html}
  {:else}
    <pre class="text-gray-100 whitespace-pre overflow-x-auto sm:whitespace-pre sm:overflow-x-auto" class:pre-wrap={wrap} class:overflow-x-hidden={wrap}>
      <code>{code}</code>
    </pre>
  {/if}
</div>

<style>
  .wrap :global(.shiki),
  .wrap :global(.shiki pre) {
    background: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
    min-width: 0;
    overflow-x: auto;
  }

  .wrap :global(.shiki code) {
    display: block;
    font-size: 0.75rem;
    line-height: 1.5;
    white-space: pre;
    word-break: normal;
    overflow-wrap: normal;
    background: transparent !important;
  }

  .wrap.wrap :global(.shiki code) {
    white-space: pre-wrap !important;
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
  }

  .wrap pre {
    background: transparent;
    padding: 0;
    margin: 0;
    min-width: 0;
    overflow-x: auto;
  }

  .wrap code {
    display: block;
    font-size: 0.75rem;
    line-height: 1.5;
    white-space: pre;
    word-break: normal;
    overflow-wrap: normal;
  }

  .wrap.wrap code {
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  @media (max-width: 640px) {
    .wrap :global(.shiki code),
    .wrap code {
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: break-word;
    }
  }
</style>
