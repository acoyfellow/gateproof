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
    content="Proof loops in the wild. Real systems, one plan, one loop."
  />
</svelte:head>

<main class="relative min-h-screen overflow-x-hidden">
  <div
    class="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.22]"
    style="background-image: url('/hero.jpg');"
  ></div>
  <div
    class="pointer-events-none absolute inset-0"
    style="background:
      radial-gradient(circle at 16% 14%, rgba(246, 174, 83, 0.12), transparent 24%),
      radial-gradient(circle at 82% 10%, rgba(255, 236, 188, 0.08), transparent 18%),
      linear-gradient(180deg, rgba(17, 14, 12, 0.97), rgba(7, 6, 5, 1));"
  ></div>

  <section class="relative mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14">
    <div class="mx-auto max-w-3xl">
      <p class="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
        Case Studies
      </p>
      <h1 class="mt-4 text-4xl leading-tight text-foreground sm:text-5xl">
        Proof loops in the wild.
      </h1>
      <p class="mt-5 text-sm leading-7 text-secondary-foreground sm:text-base">
        Real systems driven by a plan. One loop, no mid-run edits. We run an iteration, freeze inputs and outputs, and document what happened.
      </p>
    </div>

    <ul class="relative mx-auto mt-12 max-w-3xl space-y-6">
      {#each data.caseStudies as entry}
        <li>
          <a
            href={entry.href}
            class="block overflow-hidden rounded-2xl border border-border/80 bg-card/70 p-6 shadow-xl shadow-black/20 transition hover:border-border hover:bg-card/80"
          >
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  #{entry.number} · {entry.iteration}
                </span>
                <h2 class="mt-2 text-2xl font-medium text-foreground sm:text-3xl">
                  {entry.title}
                </h2>
                <p class="mt-3 text-sm leading-7 text-secondary-foreground">
                  {entry.description}
                </p>
              </div>
              <span class="text-sm font-medium text-foreground shrink-0">Read →</span>
            </div>
          </a>
        </li>
      {/each}
    </ul>
  </section>
</main>
