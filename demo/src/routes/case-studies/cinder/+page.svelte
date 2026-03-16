<script lang="ts">
  import { ExternalLink } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import type { CinderCaseStudyContent } from '$scripts/render-scope';

  interface Props {
    data: CinderCaseStudyContent;
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>gateproof - {data.title}</title>
  <meta name="description" content={data.description} />
</svelte:head>

<main class="min-h-screen bg-background">
  <section class="mx-auto max-w-5xl px-4 py-10 sm:px-8 sm:py-14">
    <div class="mx-auto max-w-4xl">
      <p class="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{data.studyLabel}</p>
      <h1 class="mt-4 text-4xl leading-tight text-foreground sm:text-5xl">{data.title}</h1>

      <div class="mt-10 space-y-10">
        <section>
          <h2 class="text-2xl text-foreground sm:text-3xl">What this is</h2>
          <p class="mt-4 text-sm leading-7 text-secondary-foreground sm:text-base">{data.whatThisIs}</p>
        </section>

        <section>
          <h2 class="text-2xl text-foreground sm:text-3xl">Current state</h2>
          <p class="mt-4 text-sm leading-7 text-secondary-foreground sm:text-base">{data.currentState}</p>
        </section>

        <section>
          <h2 class="text-2xl text-foreground sm:text-3xl">How to read this</h2>
          <p class="mt-4 text-sm leading-7 text-secondary-foreground sm:text-base">{data.howToRead}</p>
        </section>

        <section>
          <h2 class="text-2xl text-foreground sm:text-3xl">Chapters</h2>
          <div class="mt-4 space-y-6">
            {#each data.chapters as chapter}
              <article class="rounded-[1.4rem] border border-border/80 bg-card/70">
                <div class="border-b border-border/60 px-4 py-5 sm:px-6">
                  <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{chapter.label}</p>
                  <div class="mt-3 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
                    <div class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Status</div>
                    <div class="text-sm leading-7 text-foreground">{chapter.status}</div>
                  </div>
                  <div class="mt-3 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
                    <div class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Claim</div>
                    <div class="text-sm leading-7 text-foreground">{chapter.claim}</div>
                  </div>
                  <div class="mt-3 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
                    <div class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">What happened</div>
                    <div class="text-sm leading-7 text-secondary-foreground">{chapter.whatHappened}</div>
                  </div>
                </div>

                <div class="space-y-6 px-4 py-5 sm:px-6">
                  {#if chapter.evidenceSections.length > 0}
                    <section>
                      <h3 class="text-lg text-foreground">{chapter.evidenceHeading ?? 'Evidence'}</h3>
                      <div class="mt-4 space-y-4">
                        {#each chapter.evidenceSections as section}
                          <article class="rounded-[1.2rem] border border-border/80 bg-background/30 px-4 py-4">
                            <h4 class="text-base text-foreground">{section.title}</h4>
                            {#if section.summary}
                              <p class="mt-2 text-sm leading-7 text-secondary-foreground">{section.summary}</p>
                            {/if}
                            <ul class="mt-3 space-y-3">
                              {#each section.items as item}
                                <li class="text-sm leading-7 text-secondary-foreground">{item}</li>
                              {/each}
                            </ul>
                          </article>
                        {/each}
                      </div>
                    </section>
                  {/if}

                  <section>
                    <h3 class="text-lg text-foreground">Artifacts</h3>
                    <div class="mt-4 flex flex-wrap gap-3">
                      {#each chapter.artifacts as artifact}
                        <Button
                          href={artifact.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="surface"
                          size="pill-sm"
                        >
                          {artifact.label}
                          <ExternalLink class="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      {/each}
                    </div>
                    <div class="mt-4 space-y-4">
                      {#each chapter.artifacts as artifact}
                        <article class="rounded-[1.2rem] border border-border/80 bg-background/30">
                          <div class="px-4 py-4">
                            <div class="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <h4 class="text-base text-foreground">{artifact.label}</h4>
                                <p class="mt-2 text-sm leading-7 text-secondary-foreground">{artifact.note}</p>
                              </div>
                              <Button
                                href={artifact.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="default"
                                size="pill"
                                class="shrink-0"
                              >
                                Open artifact
                                <ExternalLink class="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            </div>
                            {#if artifact.code}
                              <details class="mt-4 rounded-xl border border-border/60 bg-background/40">
                                <summary class="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground">
                                  View raw artifact
                                </summary>
                                <pre class="overflow-x-auto border-t border-border/60 px-4 py-4 font-mono text-xs leading-relaxed text-secondary-foreground"><code>{artifact.code}</code></pre>
                              </details>
                            {/if}
                          </div>
                        </article>
                      {/each}
                    </div>
                  </section>

                  <section>
                    <h3 class="text-lg text-foreground">{chapter.limitationsHeading ?? "What this doesn't prove"}</h3>
                    <ul class="mt-4 space-y-3">
                      {#each chapter.limitations as item}
                        <li class="rounded-xl border border-border/70 bg-background/30 px-4 py-3 text-sm leading-7 text-secondary-foreground">
                          {item}
                        </li>
                      {/each}
                    </ul>
                  </section>
                </div>
              </article>
            {/each}
          </div>
        </section>

        <section>
          <h2 class="text-2xl text-foreground sm:text-3xl">What's next</h2>
          <p class="mt-4 text-sm leading-7 text-secondary-foreground sm:text-base">{data.whatsNext}</p>
        </section>
      </div>
    </div>
  </section>
</main>
