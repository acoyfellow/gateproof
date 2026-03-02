<script lang="ts">
  import CodeBlock from '$lib/components/CodeBlock.svelte';
  import type { HomepageContent } from '../../../scripts/render-scope';

  interface Props {
    data: HomepageContent;
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>gateproof - Build in reverse</title>
  <meta
    name="description"
    content="Write the green state first. Then let one proof loop decide whether the live product is actually real."
  />
</svelte:head>

<main class="relative min-h-screen overflow-x-hidden">
  <div
    class="pointer-events-none absolute inset-0"
    style="background:
      radial-gradient(circle at 16% 14%, rgba(246, 174, 83, 0.16), transparent 24%),
      radial-gradient(circle at 82% 10%, rgba(255, 236, 188, 0.10), transparent 18%),
      radial-gradient(circle at 76% 70%, rgba(175, 83, 27, 0.12), transparent 22%),
      linear-gradient(180deg, rgba(17, 14, 12, 0.98), rgba(7, 6, 5, 1));"
  ></div>

  <section class="relative mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14">
    <div class="mx-auto max-w-6xl">
      <section class="pt-2">
        <p class="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{data.eyebrow}</p>
        <h1 class="mt-4 max-w-4xl text-5xl leading-[0.92] text-foreground sm:text-7xl">
          {data.headline}
        </h1>
        <p class="mt-5 max-w-2xl text-sm leading-7 text-secondary-foreground sm:text-base">
          {data.subheadline}
        </p>
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
          <CodeBlock code={data.snippetCode} language="typescript" wrap={true} />
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
        <a
          href={data.ctaHref}
          class="group block overflow-hidden rounded-[2rem] border border-border/80 bg-card/70 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm transition hover:border-border"
        >
          <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{data.ctaEyebrow}</p>
          <div class="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 class="text-3xl leading-tight text-foreground sm:text-5xl">{data.ctaTitle}</h2>
              <p class="mt-4 max-w-3xl text-sm leading-7 text-secondary-foreground sm:text-base">
                {data.ctaBody}
              </p>
            </div>
            <p class="text-sm font-medium text-foreground sm:text-base">
              {data.ctaLabel}
              <span class="inline-block transition group-hover:translate-x-1"> →</span>
            </p>
          </div>
        </a>
      </section>
    </div>
  </section>
</main>
