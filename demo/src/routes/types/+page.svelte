<script lang="ts">
  import CodeBlock from '$lib/components/CodeBlock.svelte';

  interface Section {
    title: string;
    code: string;
    html: string;
  }

  interface Props {
    data: {
      sections: Section[];
    };
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>Type reference - gateproof</title>
</svelte:head>

<div class="min-h-screen p-8 max-w-2xl mx-auto">
  <a href="/" class="text-sm opacity-50 hover:opacity-80 transition-opacity">&larr; back</a>

  <h1 class="text-lg mt-6 mb-8 opacity-70">type reference</h1>

  {#each data.sections as section}
    <section class="mb-10">
      <h2 class="text-xs uppercase tracking-widest opacity-40 mb-3">{section.title}</h2>
      <CodeBlock code={section.code} html={section.html} />
    </section>
  {/each}

  <p class="text-xs opacity-30 mt-12">
    source: src/index.ts
  </p>
</div>
