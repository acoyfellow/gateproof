<script lang="ts">
  import CodeBlock from '$lib/components/CodeBlock.svelte';

  interface Props {
    data: {
      eyebrow: string;
      headline: string;
      subheadline: string;
      steps: Array<{
        label: string;
        mode: "direct" | "attached";
        title: string;
        proves: string;
        changed: string;
        fileName: string;
        code: string;
      }>;
    };
  }

  let { data }: Props = $props();
  let activeIndex = $state(0);
  const activeStep = $derived(data.steps[activeIndex] ?? data.steps[0]);
</script>

<svelte:head>
  <title>gateproof - Progress the same loop</title>
  <meta
    name="description"
    content={data.subheadline}
  />
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
      <p class="mt-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
        Each step is the same model. Only the target gets bigger.
      </p>

      <div class="mt-10 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div class="rounded-[1.75rem] border border-border/70 bg-card/50 p-3 shadow-xl shadow-black/20 backdrop-blur-sm">
          {#each data.steps as step, index}
            <button
              type="button"
              class={`group flex w-full items-start gap-3 rounded-[1.15rem] border px-3 py-3 text-left transition-all duration-200 ${
                index === activeIndex
                  ? 'border-border/80 bg-background/85'
                  : 'border-transparent'
              }`}
              onclick={() => (activeIndex = index)}
            >
              <span
                class={`mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full border px-2 text-[10px] font-medium uppercase tracking-[0.18em] ${
                  index === activeIndex
                    ? 'border-accent/70 text-accent'
                    : 'border-border/60 text-muted-foreground'
                }`}
              >
                {index + 1}
              </span>
              <span class="min-w-0">
                <span class="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {step.label}
                </span>
                <span
                  class={`mt-1 block text-sm leading-5 ${
                    index === activeIndex ? 'text-foreground' : 'text-secondary-foreground'
                  }`}
                >
                  {step.title}
                </span>
              </span>
            </button>
          {/each}
        </div>

        <div class="overflow-hidden rounded-[1.9rem] border border-border/80 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur-sm">
          <div class="border-b border-border/70 px-5 py-4">
            <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{activeStep.label}</p>
            <p class="mt-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Mode: {activeStep.mode === "direct" ? "Run plan.ts directly" : "Attach an agent to plan.ts"}
            </p>
            <h2 class="mt-3 max-w-3xl text-2xl leading-tight text-foreground sm:text-4xl">
              {activeStep.title}
            </h2>
            <p class="mt-3 max-w-3xl text-sm leading-7 text-secondary-foreground sm:text-base">
              {activeStep.proves}
            </p>
            <p class="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              What changed: {activeStep.changed}
            </p>
          </div>

          <div class="border-b border-border/60 px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {activeStep.fileName}
          </div>
          <div class="p-4 sm:p-6">
            <CodeBlock code={activeStep.code} language="typescript" wrap={true} />
          </div>
          <div class="border-t border-border/60 px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Same loop. Bigger target.
          </div>
        </div>
      </div>
    </div>
  </section>
</main>
