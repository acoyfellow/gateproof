<script lang="ts">
  import CodeBlock from '$lib/components/CodeBlock.svelte';
  import ProofLoopDemo from '$lib/components/ProofLoopDemo.svelte';
  import LeanGateTerminal from '$lib/components/LeanGateTerminal.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Github, BookOpen } from '@lucide/svelte';
  import { reveal } from '$lib/reveal';
  import type { HomepageContent } from '$lib/homepage-content';

  interface Props {
    data: HomepageContent;
  }

  let { data }: Props = $props();

  const emberCount = 8;
</script>

<svelte:head>
  <title>gateproof — proof authority for coding agents</title>
  <meta
    name="description"
    content="Gateproof runs a proof loop for coding agents. Stories in plan.ts define the gate. Agents may change code inside scope. They may not change the proof."
  />
</svelte:head>

<main class="relative min-h-screen overflow-x-hidden bg-[#070605]">
  <div class="absolute inset-0 z-0 h-full max-h-screen overflow-hidden" aria-hidden="true">
    <div
      class="pointer-events-none absolute inset-0 -mt-40 max-h-screen bg-cover bg-center opacity-50"
      style="background-image: url('/hero.jpg'); background-position: center 12%;"
    ></div>
    <div class="gp-glow pointer-events-none absolute left-1/2 top-1/3 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full blur-3xl" style="background: radial-gradient(circle, rgba(246,140,60,0.22), transparent 65%);"></div>
    {#each Array.from({ length: emberCount }, (_, index) => index) as index}
      <span class="gp-ember" style="left: {6 + ((index * 37) % 88)}%; --gp-i: {index}; --gp-drift: {index % 2 === 0 ? 24 : -18}px;"></span>
    {/each}
  </div>

  <section class="relative mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14">
    <div class="mx-auto max-w-6xl">
      <section class="relative min-h-[72vh]">
        <div class="relative flex min-h-[72vh] items-end py-6 sm:py-8 lg:items-center">
          <div class="relative max-w-3xl rounded-[2rem] border border-[rgba(255,151,82,0.16)] bg-[rgba(11,9,8,0.42)] px-6 py-7 shadow-[0_25px_80px_rgba(0,0,0,0.34)] backdrop-blur-md sm:px-8 sm:py-8">
            <div class="gp-rise flex flex-wrap items-center gap-3" style="--gp-i: 0">
              <p class="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{data.eyebrow}</p>
              <span class="inline-flex items-center gap-1.5 rounded-full border border-border/80 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-secondary-foreground">
                                {data.versionNote}
              </span>
            </div>
            <h1 class="gp-rise mt-4 max-w-4xl text-5xl leading-[0.92] text-foreground sm:text-7xl" style="--gp-i: 1">
              {data.headline}
            </h1>
            <p class="gp-rise mt-5 max-w-2xl text-sm leading-7 text-secondary-foreground sm:text-base" style="--gp-i: 2">
              {data.subheadline}
            </p>
            <div class="gp-rise mt-6 flex flex-wrap gap-3 text-sm" style="--gp-i: 3">
              <Button href={data.githubHref} variant="default" size="pill-sm">
                <Github class="h-3.5 w-3.5" aria-hidden="true" />
                <span>View on GitHub</span>
              </Button>
              <Button href={data.docsHref} variant="surface" size="pill-sm">
                <BookOpen class="h-3.5 w-3.5" aria-hidden="true" />
                <span>Read the docs</span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section use:reveal class="mt-10 overflow-hidden rounded-[2rem] border border-border/80 bg-card/75 shadow-2xl shadow-black/30 backdrop-blur-sm">
        <div class="border-b border-border/70 px-5 py-4">
          <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{data.snippetLabel}</p>
          <h2 class="mt-3 max-w-3xl text-2xl leading-tight text-foreground sm:text-4xl">{data.snippetTitle}</h2>
          <p class="mt-3 max-w-3xl text-sm leading-7 text-secondary-foreground sm:text-base">{data.snippetBody}</p>
        </div>
        <div class="p-4 sm:p-6">
          <CodeBlock code={data.snippetCode} html={data.snippetHtml} language="typescript" wrap={true} />
          <p class="mt-3 font-mono text-[11px] text-muted-foreground">{data.snippetNote}</p>
        </div>
      </section>

      <section use:reveal class="mt-10">
        <ProofLoopDemo />
      </section>

      <section class="mt-14">
        <h2 use:reveal class="text-3xl leading-tight text-foreground sm:text-5xl">{data.featuresTitle}</h2>
        <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each data.features as feature}
            <a
              use:reveal
              href={feature.href}
              class="group rounded-[1.5rem] border border-border/70 bg-card/55 p-5 backdrop-blur-sm transition-[border-color,transform] duration-300 hover:border-accent/60 gp-lift"
            >
              <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">{feature.tag}</p>
              <p class="mt-2 text-base font-medium text-foreground">{feature.title}</p>
              <p class="mt-2 text-sm leading-6 text-secondary-foreground">{feature.body}</p>
              <p class="mt-3 text-xs text-muted-foreground transition-colors group-hover:text-accent">Read more →</p>
            </a>
          {/each}
        </div>
      </section>

      <section class="mt-14">
        <LeanGateTerminal />
      </section>

      <section use:reveal class="mt-14 mb-6">
        <div class="overflow-hidden rounded-[2rem] border border-border/80 bg-card/70 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm">
          <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{data.ctaEyebrow}</p>
          <div class="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 class="text-3xl leading-tight text-foreground sm:text-5xl">{data.ctaTitle}</h2>
              <p class="mt-4 max-w-3xl text-sm leading-7 text-secondary-foreground sm:text-base">{data.ctaBody}</p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-3">
              <Button href={data.ctaHref} variant="default" size="pill-lg">{data.ctaLabel}</Button>
              <Button href={data.githubHref} variant="surface" size="pill-lg">
                <Github class="h-4 w-4" aria-hidden="true" />
                <span>GitHub</span>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
</main>
