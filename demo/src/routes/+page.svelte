<script lang="ts">
  import CodeBlock from '$lib/components/CodeBlock.svelte';

  interface Props {
    data: {
      eyebrow: string;
      headline: string;
      subheadline: string;
      provisionLabel: string;
      provisionCode: string;
      planLabel: string;
      planCode: string;
      support: ReadonlyArray<string>;
    };
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>gateproof - Provision once. Prove the live system.</title>
  <meta name="description" content={data.subheadline} />
</svelte:head>

<main class="relative min-h-screen overflow-x-hidden">
  <div
    class="pointer-events-none absolute inset-0"
    style="background:
      radial-gradient(circle at 18% 16%, rgba(255, 138, 76, 0.16), transparent 24%),
      radial-gradient(circle at 78% 12%, rgba(255, 214, 153, 0.08), transparent 20%),
      linear-gradient(180deg, rgba(23, 16, 12, 0.96), rgba(8, 7, 6, 1));"
  ></div>

  <section class="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12 sm:px-8 sm:py-16">
    <div class="mx-auto w-full max-w-5xl">
      <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">{data.eyebrow}</p>
      <h1 class="mt-4 max-w-4xl text-5xl leading-[0.96] text-foreground sm:text-7xl">
        {data.headline}
      </h1>
      <p class="mt-5 max-w-2xl text-sm leading-7 text-secondary-foreground sm:text-base">
        {data.subheadline}
      </p>

      <div class="mt-10 grid gap-6">
        <div class="overflow-hidden rounded-[1.9rem] border border-border/80 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur-sm">
          <div class="border-b border-border/70 px-5 py-4">
            <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {data.provisionLabel}
            </p>
            <h2 class="mt-3 max-w-3xl text-2xl leading-tight text-foreground sm:text-4xl">
              Infrastructure first
            </h2>
            <p class="mt-3 max-w-3xl text-sm leading-7 text-secondary-foreground sm:text-base">
              Alchemy creates the live system once. This is not part of the retry loop.
            </p>
          </div>
          <div class="p-4 sm:p-6">
            <CodeBlock code={data.provisionCode} language="typescript" wrap={true} />
          </div>
        </div>

        <div class="overflow-hidden rounded-[1.9rem] border border-border/80 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur-sm">
          <div class="border-b border-border/70 px-5 py-4">
            <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {data.planLabel}
            </p>
            <h2 class="mt-3 max-w-3xl text-2xl leading-tight text-foreground sm:text-4xl">
              One proof loop
            </h2>
            <p class="mt-3 max-w-3xl text-sm leading-7 text-secondary-foreground sm:text-base">
              Gateproof only decides one thing: whether the live product is actually green.
            </p>
          </div>
          <div class="p-4 sm:p-6">
            <CodeBlock code={data.planCode} language="typescript" wrap={true} />
          </div>
          <div class="border-t border-border/60 px-5 py-4">
            <ul class="space-y-2 text-sm leading-6 text-secondary-foreground">
              {#each data.support as line}
                <li>{line}</li>
              {/each}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</main>
