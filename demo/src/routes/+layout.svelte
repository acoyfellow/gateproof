<script lang="ts">
  import "../app.css";
  import { Github } from "@lucide/svelte";
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();

  const githubHref = "https://github.com/acoyfellow/gateproof";
</script>

<header class="sticky top-0 z-100 border-b border-border/60 bg-background/10 backdrop-blur-xl shadow-lg shadow-black/10">
  <div class="mx-auto flex items-center justify-between px-4 py-3 sm:px-8 max-w-6xl">
    <a href="/" class="flex items-center gap-2 text-foreground hover:opacity-90">
      <img src="/logo.svg" alt="Gateproof" class="h-12 w-auto min-h-12" width="46" height="15" />
    </a>
    <nav class="flex items-center gap-5 text-sm sm:gap-6">
      <a href="/docs" class="text-muted-foreground hover:text-foreground">Docs</a>
      <a href="/docs/tutorials/first-gate" class="hidden text-muted-foreground hover:text-foreground sm:inline">Tutorial</a>
      <a href="/case-studies" class="text-muted-foreground hover:text-foreground">Case Studies</a>
      <a
        href={githubHref}
        class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-foreground transition-colors hover:border-accent hover:text-accent"
      >
        <Github class="h-3.5 w-3.5" aria-hidden="true" />
        <span>GitHub</span>
      </a>
    </nav>
  </div>
</header>
{@render children()}
<footer class="border-t border-border/60 bg-background">
  <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-8">
    <span>gateproof · MIT</span>
    <nav class="flex gap-5">
      <a href={githubHref} class="hover:text-foreground">GitHub</a>
      <a href="/docs" class="hover:text-foreground">Docs</a>
      <a href="/llms.txt" class="hover:text-foreground">llms.txt</a>
    </nav>
  </div>
</footer>
