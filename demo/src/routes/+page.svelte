<script lang="ts">
  import CodeBlock from '$lib/components/CodeBlock.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Github, Package } from '@lucide/svelte';
  import type { HomepageContent } from '$lib/homepage-content';

  interface Props {
    data: HomepageContent;
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>gateproof - Pass/fail gates for agentic coding loops</title>
  <meta
    name="description"
    content="A TypeScript library for writing pass/fail gates that agentic coding loops run against. Define what working looks like — the agent iterates until it gets there."
  />
</svelte:head>

<main class="relative min-h-screen overflow-x-hidden bg-[#070605]">
  <div class="absolute inset-0 h-full max-h-screen z-0">
    
  <div
    class="pointer-events-none absolute inset-0 opacity-50 bg-cover bg-center max-h-screen -mt-40"
    style="background-image: url('/hero.jpg'); background-position: center 12%; "
  ></div>
  </div>

  <section class="relative mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14">
    <div class="mx-auto max-w-6xl">
      <section class="relative min-h-[72vh]">
        
        <div class="relative flex min-h-[72vh] items-end py-6 sm:py-8 lg:items-center">
          <div class="max-w-3xl rounded-[2rem] border border-[rgba(255,151,82,0.16)] bg-[rgba(11,9,8,0.42)] px-6 py-7 shadow-[0_25px_80px_rgba(0,0,0,0.34)] backdrop-blur-md sm:px-8 sm:py-8">
            <div
              class="pointer-events-none absolute -left-12 top-10 h-40 w-40 rounded-full blur-3xl"
              style="background: rgba(246, 174, 83, 0.14);"
            ></div>
            <div
              class="pointer-events-none absolute inset-0 rounded-[2.5rem]"
              style="background:
                linear-gradient(90deg, rgba(11,9,8,0.78) 0%, rgba(11,9,8,0.52) 28%, rgba(11,9,8,0.16) 58%, rgba(11,9,8,0.34) 100%),
                linear-gradient(180deg, rgba(11,9,8,0.08) 0%, rgba(11,9,8,0.02) 38%, rgba(11,9,8,0.72) 100%);"
            ></div>
            <p class="relative text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{data.eyebrow}</p>
            <h1 class="relative mt-4 max-w-4xl text-5xl leading-[0.92] text-foreground sm:text-7xl">
              {data.headline}
            </h1>
            <p class="relative mt-5 max-w-2xl text-sm leading-7 text-secondary-foreground sm:text-base">
              {data.subheadline}
            </p>
            <div class="relative mt-6 flex flex-wrap gap-3 text-sm text-secondary-foreground">
              <Button href={data.githubHref} variant="surface" size="pill-sm">
                <Github class="h-3.5 w-3.5" aria-hidden="true" />
                <span>GitHub</span>
              </Button>
              <Button href={data.npmHref} variant="surface" size="pill-sm">
                <Package class="h-3.5 w-3.5" aria-hidden="true" />
                <span>npm</span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section class="mt-10 overflow-hidden rounded-[2rem] border border-border/80 bg-card/75 shadow-2xl shadow-black/30 backdrop-blur-sm">
        <div class="border-b border-border/70 px-5 py-4">
          <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {data.snippetLabel}
          </p>
          <h2 class="mt-3 max-w-3xl text-2xl leading-tight text-foreground sm:text-4xl">
            {data.snippetTitle}
          </h2>
          <p class="mt-3 max-w-3xl text-sm leading-7 text-secondary-foreground sm:text-base">
            {data.snippetBody}
          </p>
        </div>
        <div class="p-4 sm:p-6">
          <CodeBlock code={data.snippetCode} html={data.snippetHtml} language="typescript" wrap={true} />
        </div>
      </section>

      <section class="mt-10 grid gap-4 sm:grid-cols-3">
        {#each data.principles as principle}
          <div class="rounded-[1.5rem] border border-border/70 bg-card/55 p-4 backdrop-blur-sm">
            <p class="text-sm font-medium text-foreground">{principle.title}</p>
            <p class="mt-2 text-sm leading-6 text-secondary-foreground">{principle.body}</p>
          </div>
        {/each}
      </section>

      <section class="mt-12">
        <div class="overflow-hidden rounded-[2rem] border border-border/80 bg-card/70 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm">
          <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{data.ctaEyebrow}</p>
          <div class="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 class="text-3xl leading-tight text-foreground sm:text-5xl">{data.ctaTitle}</h2>
              <p class="mt-4 max-w-3xl text-sm leading-7 text-secondary-foreground sm:text-base">
                {data.ctaBody}
              </p>
            </div>
            <Button href={data.ctaHref} variant="default" size="pill-lg" class="shrink-0">
              {data.ctaLabel}
            </Button>
          </div>
        </div>
      </section>
    </div>
  </section>
</main>
