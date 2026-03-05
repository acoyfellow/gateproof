<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import type { CinderCaseStudyContent } from '../../../../scripts/render-scope';

  interface Props {
    data: CinderCaseStudyContent;
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>gateproof - Cinder Case Study</title>
  <meta name="description" content={data.subheadline} />
</svelte:head>

<main class="relative min-h-screen overflow-x-hidden">
  <div
    class="pointer-events-none absolute inset-0"
    style="background:
      radial-gradient(circle at 14% 14%, rgba(245, 169, 98, 0.22), transparent 24%),
      radial-gradient(circle at 86% 10%, rgba(242, 216, 158, 0.12), transparent 18%),
      radial-gradient(circle at 76% 74%, rgba(186, 92, 38, 0.16), transparent 24%),
      linear-gradient(180deg, rgba(20, 14, 10, 0.98), rgba(7, 6, 5, 1));"
  ></div>

  <section class="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 py-10 sm:px-8 sm:py-14">
    <div class="mx-auto w-full max-w-6xl">
      <div class="grid gap-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:items-start">
        <div class="pt-2 lg:sticky lg:top-10">
          <p class="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{data.eyebrow}</p>
          <h1 class="mt-4 max-w-4xl text-5xl leading-[0.92] text-foreground sm:text-7xl">
            {data.headline}
          </h1>
          <p class="mt-5 max-w-xl text-sm leading-7 text-secondary-foreground sm:text-base">
            We started with just {data.startedWith}
          </p>
          <p class="mt-3 max-w-xl text-sm leading-7 text-secondary-foreground sm:text-base">
            {data.methodStatement}
          </p>
          <p class="mt-5 max-w-xl text-sm leading-7 text-secondary-foreground sm:text-base">
            {data.subheadline}
          </p>

          <a
            href="/docs"
            class="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-foreground shadow-sm transition hover:opacity-90"
          >
            Read the docs
            <span aria-hidden="true">→</span>
          </a>

          <div class="mt-8 overflow-hidden rounded-[1.7rem] border border-border/70 bg-card/60 shadow-2xl shadow-black/25 backdrop-blur-sm">
            <div class="border-b border-border/60 px-5 py-4">
              <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Procedure
              </p>
            </div>
            <ol class="space-y-0">
              {#each data.support as line, index}
                <li class="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-border/40 px-5 py-4 last:border-b-0">
                  <span class="text-2xl leading-none text-foreground/80">{index + 1}</span>
                  <span class="text-sm leading-7 text-secondary-foreground sm:text-base">{line}</span>
                </li>
              {/each}
            </ol>
          </div>

          <div class="mt-6 overflow-hidden rounded-[1.7rem] border border-border/70 bg-card/60 shadow-2xl shadow-black/25 backdrop-blur-sm">
            <div class="border-b border-border/60 px-5 py-4">
              <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Run conditions
              </p>
            </div>
            <ul class="space-y-2 px-5 py-4">
              {#each data.runConditions as condition}
                <li class="text-sm leading-6 text-secondary-foreground">{condition}</li>
              {/each}
            </ul>
          </div>

          <div class="mt-6 overflow-hidden rounded-[1.7rem] border border-border/70 bg-card/60 shadow-2xl shadow-black/25 backdrop-blur-sm">
            <div class="border-b border-border/60 px-5 py-4">
              <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {data.statusLabel}
              </p>
            </div>
            <div class="px-5 py-4">
              <p class="text-sm font-medium text-foreground">{data.statusTitle}</p>
              <p class="mt-2 text-sm leading-6 text-secondary-foreground">{data.statusBody}</p>
            </div>
          </div>
        </div>

        <div class="grid gap-6">
          <div class="overflow-hidden rounded-[2rem] border border-border/80 bg-card/75 shadow-2xl shadow-black/30 backdrop-blur-sm">
            <div class="border-b border-border/70 px-5 py-4">
              <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {data.provisionLabel}
              </p>
              <h2 class="mt-3 max-w-3xl text-2xl leading-tight text-foreground sm:text-4xl">
                Provisioning
              </h2>
              <p class="mt-3 max-w-3xl text-sm leading-7 text-secondary-foreground sm:text-base">
                Creates the environment the proof loop interrogates. Runs once. Excluded from retry.
              </p>
            </div>
            <div class="px-5 py-4">
              <a
                href={data.provisionUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm font-medium text-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground"
              >
                alchemy.run.ts
              </a>
            </div>
          </div>

          <div class="overflow-hidden rounded-[2rem] border border-border/80 bg-card/75 shadow-2xl shadow-black/30 backdrop-blur-sm">
            <div class="border-b border-border/70 px-5 py-4">
              <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {data.planLabel}
              </p>
              <h2 class="mt-3 max-w-3xl text-2xl leading-tight text-foreground sm:text-4xl">
                Proof contract
              </h2>
              <p class="mt-3 max-w-3xl text-sm leading-7 text-secondary-foreground sm:text-base">
                Defines what must hold in the live system. Handed to the agent on each iteration.
              </p>
            </div>
            <div class="space-y-3 px-5 py-4">
              {#if data.planPseudocode}
                <pre class="overflow-x-auto rounded-lg border border-border/40 bg-muted/30 px-3 py-2 font-mono text-xs leading-relaxed text-foreground"><code>{data.planPseudocode}</code></pre>
              {/if}
              <a
                href={data.planUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="block text-sm font-medium text-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground"
              >
                plan.ts
              </a>
            </div>
          </div>

          <div class="overflow-hidden rounded-[2rem] border border-border/80 bg-card/75 shadow-2xl shadow-black/30 backdrop-blur-sm">
            <div class="border-b border-border/70 px-5 py-4">
              <h2 class="max-w-3xl text-2xl leading-tight text-foreground sm:text-4xl">
                {data.historyTitle}
              </h2>
              <p class="mt-3 max-w-3xl text-sm leading-7 text-secondary-foreground sm:text-base">
                {data.historyBody}
              </p>
            </div>
            <div class="space-y-4 p-5 sm:p-6">
              <div class="flex flex-wrap gap-3">
                <Button
                  href={data.startRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="default"
                  size="lg"
                >
                  {data.startRepoLabel}
                </Button>
                <Button
                  href={data.endRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="default"
                  size="lg"
                >
                  {data.endRepoLabel}
                </Button>
              </div>
              <p class="text-sm leading-7 text-secondary-foreground pt-2 border-t border-border/40">{data.roundTwoTeaser}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</main>
