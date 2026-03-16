<script lang="ts">
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

<main class="min-h-screen bg-background">
  <section class="mx-auto max-w-5xl px-4 py-10 sm:px-8 sm:py-14">
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
          <a
            href={entry.href}
            class="block rounded-[1.4rem] border border-border/80 bg-card/70 p-6 transition hover:border-border hover:bg-card/80"
          >
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
              <span class="shrink-0 text-sm font-medium text-foreground">Open record →</span>
            </div>
          </a>
        </li>
      {/each}
    </ul>
  </section>
</main>
