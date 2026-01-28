<script lang="ts">
  import CodeBlock from '$lib/components/CodeBlock.svelte';
</script>

<svelte:head>
  <title>Story type reference - gateproof</title>
</svelte:head>

<div class="min-h-screen p-8 max-w-2xl mx-auto">
  <a href="/" class="text-sm opacity-50 hover:opacity-80 transition-opacity">&larr; back</a>

  <h1 class="text-lg mt-6 mb-8 opacity-70">type reference</h1>

  <section class="mb-10">
    <h2 class="text-xs uppercase tracking-widest opacity-40 mb-3">Story</h2>
    <CodeBlock code={`type Story<TId extends string = string> = {
  id: TId;
  title: string;
  gateFile: string;
  dependsOn?: TId[];
  scope?: StoryScope;
  progress?: string[];
};`} />
  </section>

  <section class="mb-10">
    <h2 class="text-xs uppercase tracking-widest opacity-40 mb-3">StoryScope</h2>
    <CodeBlock code={`interface StoryScope {
  allowedPaths?: string[];
  forbiddenPaths?: string[];
  maxChangedFiles?: number;
  maxChangedLines?: number;
};`} />
  </section>

  <section class="mb-10">
    <h2 class="text-xs uppercase tracking-widest opacity-40 mb-3">Prd</h2>
    <CodeBlock code={`type Prd<TId extends string = string> = {
  stories: readonly Story<TId>[];
};`} />
  </section>

  <section class="mb-10">
    <h2 class="text-xs uppercase tracking-widest opacity-40 mb-3">GateResult</h2>
    <CodeBlock code={`type GateResult = {
  status: "success" | "failed" | "timeout";
  [key: string]: unknown;
};`} />
  </section>

  <p class="text-xs opacity-30 mt-12">
    source: src/prd/types.ts
  </p>
</div>
