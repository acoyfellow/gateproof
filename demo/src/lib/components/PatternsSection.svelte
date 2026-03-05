<script lang="ts">
  import CodeBlock from './CodeBlock.svelte';
  import { patternsContent } from '$lib/demo-content';

  type PatternId = (typeof patternsContent)[number]['id'];

  let selected = $state<PatternId>(patternsContent[0]?.id ?? 'minimal');
  let current = $derived.by(() => patternsContent.find((p) => p.id === selected)!);
</script>

<section class="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0b0a07] py-20 text-balance">
  <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-8">
    <div class="text-center mb-12">
      <h2 class="text-4xl sm:text-5xl md:text-6xl font-semibold mb-4 text-white">
        Patterns you can steal
      </h2>
      <p class="text-lg sm:text-xl max-w-3xl mx-auto text-white/70">
        Drop-in examples from real files. Change the source, the demo updates.
      </p>
    </div>

    <div class="flex flex-wrap justify-center gap-3 mb-8 px-6">
      {#each patternsContent as pattern (pattern.id)}
        <button
          onclick={() => selected = pattern.id}
          class="px-6 py-3 rounded-lg font-medium transition-all {selected === pattern.id
            ? 'bg-amber-400 text-black shadow-lg'
            : 'bg-white/10 text-white/80 hover:bg-white/20'}"
        >
          {pattern.tab}
        </button>
      {/each}
    </div>

    <div class="max-w-2xl mx-auto">
      <div class="bg-black/60 rounded-lg shadow-lg border border-white/10 overflow-hidden">
        <div class="p-6 border-b border-white/10 bg-black/70">
          <h3 class="text-2xl font-semibold text-white mb-2">{current.title}</h3>
          <p class="text-white/65">{current.description}</p>
        </div>
        <div class="bg-gray-900 p-4 overflow-hidden min-w-0">
          {#key selected}
            <CodeBlock code={current.code} language={current.language ?? "typescript"} wrap />
          {/key}
        </div>
      </div>
    </div>

    <div class="text-center mt-12">
      <a
        href="https://github.com/acoyfellow/gateproof/tree/main/examples"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 text-black font-medium rounded-lg transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
          <path d="M9 18c-4.51 2-5-2-7-2"/>
        </svg>
        <span>View examples on GitHub</span>
      </a>
    </div>
  </div>
</section>
