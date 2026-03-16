<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import type { CaseStudyEntry } from '$scripts/render-scope';

  interface Props {
    data: { caseStudies: CaseStudyEntry[] };
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>Case Studies - gateproof</title>
  <meta
    name="description"
    content="Real systems validated by gateproof plans. Each case study documents the claim, method, outcome, and artifacts."
  />
</svelte:head>

<main class="relative min-h-screen overflow-x-hidden bg-[#070605]">
  <div class="absolute inset-0 h-full max-h-screen z-0">
    <div
      class="pointer-events-none absolute inset-0 opacity-50 bg-cover bg-center max-h-screen"
      style="background-image: url('/chaos.jpg'); background-position: center 40%;"
    ></div>
  </div>
  <section class="relative mx-auto max-w-5xl px-4 py-10 sm:px-8 sm:py-14">
    <div class="mx-auto max-w-3xl">
      <p class="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
        Case Studies
      </p>
      <h1 class="mt-4 text-4xl leading-tight text-foreground sm:text-5xl">
        Real systems, validated by a plan file.
      </h1>
      <p class="mt-5 text-sm leading-7 text-secondary-foreground sm:text-base">
        Each case study documents what was claimed, how gateproof verified it, what passed, and what didn't.
      </p>
    </div>

    <ul class="mx-auto mt-12 max-w-3xl space-y-6">
      {#each data.caseStudies as entry}
        <li>
          <article class="rounded-[1.4rem] border border-border/80 bg-card/70 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm transition hover:border-border hover:bg-card/80">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  #{entry.number} · {entry.iteration}
                </span>
                <h2 class="mt-2 text-2xl text-foreground sm:text-3xl">
                  {entry.title}
                </h2>
                <p class="mt-3 text-sm leading-7 text-secondary-foreground">
                  {entry.description}
                </p>
              </div>
              <Button href={entry.href} variant="default" size="pill" class="shrink-0">
                Open case study
                <ArrowRight class="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </article>
        </li>
      {/each}
    </ul>
  </section>
</main>
