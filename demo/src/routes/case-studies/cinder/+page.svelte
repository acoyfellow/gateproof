<script lang="ts">
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

      <dl class="mt-8 overflow-hidden rounded-[1.4rem] border border-border/80 bg-card/80">
        <div class="grid gap-2 border-b border-border/60 px-4 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:px-6">
          <dt class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Case</dt>
          <dd class="text-sm leading-6 text-foreground">{data.caseId}</dd>
        </div>
        <div class="grid gap-2 border-b border-border/60 px-4 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:px-6">
          <dt class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Status</dt>
          <dd class="text-sm leading-6 text-foreground">{data.temporalStatus}</dd>
        </div>
        <div class="grid gap-2 border-b border-border/60 px-4 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:px-6">
          <dt class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Study type</dt>
          <dd class="text-sm leading-6 text-foreground">{data.studyType}</dd>
        </div>
        <div class="grid gap-2 border-b border-border/60 px-4 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:px-6">
          <dt class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Primary claim</dt>
          <dd class="text-sm leading-6 text-foreground">{data.primaryClaim}</dd>
        </div>
        <div class="grid gap-2 border-b border-border/60 px-4 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:px-6">
          <dt class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Method</dt>
          <dd class="text-sm leading-6 text-foreground">{data.methodSummary}</dd>
        </div>
        <div class="grid gap-2 border-b border-border/60 px-4 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:px-6">
          <dt class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Observed outcome</dt>
          <dd class="text-sm leading-6 text-foreground">{data.observedOutcome}</dd>
        </div>
        <div class="grid gap-2 border-b border-border/60 px-4 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:px-6">
          <dt class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Limitations</dt>
          <dd class="text-sm leading-6 text-foreground">{data.limitations.join(' ')}</dd>
        </div>
        <div class="grid gap-2 px-4 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:px-6">
          <dt class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Artifacts</dt>
          <dd class="flex flex-wrap gap-x-4 gap-y-2 text-sm leading-6 text-foreground">
            {#each data.artifacts as artifact}
              <a
                href={artifact.url}
                target="_blank"
                rel="noopener noreferrer"
                class="underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground"
              >
                {artifact.label}
              </a>
            {/each}
          </dd>
        </div>
      </dl>

      <div class="mt-10 space-y-10">
        <section>
          <h2 class="text-2xl text-foreground sm:text-3xl">Abstract</h2>
          <p class="mt-4 text-sm leading-7 text-secondary-foreground sm:text-base">{data.abstract}</p>
          <p class="mt-4 text-sm leading-7 text-secondary-foreground sm:text-base">{data.historicalStatus}</p>
        </section>

        <section>
          <h2 class="text-2xl text-foreground sm:text-3xl">Case boundary</h2>
          <ul class="mt-4 space-y-3">
            {#each data.caseBoundary as item}
              <li class="rounded-xl border border-border/70 bg-card/60 px-4 py-3 text-sm leading-7 text-secondary-foreground">
                {item}
              </li>
            {/each}
          </ul>
        </section>

        <section>
          <h2 class="text-2xl text-foreground sm:text-3xl">Procedure</h2>
          <ol class="mt-4 space-y-3">
            {#each data.procedure as item, index}
              <li class="grid gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-3 sm:grid-cols-[2.25rem_minmax(0,1fr)]">
                <span class="text-sm leading-7 text-foreground">{index + 1}.</span>
                <span class="text-sm leading-7 text-secondary-foreground">{item}</span>
              </li>
            {/each}
          </ol>
        </section>

        <section>
          <h2 class="text-2xl text-foreground sm:text-3xl">Chapter findings</h2>
          <ul class="mt-4 space-y-3">
            {#each data.findings as item}
              <li class="rounded-xl border border-border/70 bg-card/60 px-4 py-3 text-sm leading-7 text-secondary-foreground">
                {item}
              </li>
            {/each}
          </ul>
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
                    <div class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Primary claim</div>
                    <div class="text-sm leading-7 text-foreground">{chapter.primaryClaim}</div>
                  </div>
                  <div class="mt-3 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
                    <div class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Method</div>
                    <div class="text-sm leading-7 text-secondary-foreground">{chapter.methodSummary}</div>
                  </div>
                  <div class="mt-3 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
                    <div class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Observed outcome</div>
                    <div class="text-sm leading-7 text-secondary-foreground">{chapter.observedOutcome}</div>
                  </div>
                </div>

                <div class="space-y-6 px-4 py-5 sm:px-6">
                  <section>
                    <h3 class="text-lg text-foreground">Artifacts</h3>
                    <div class="mt-4 space-y-4">
                      {#each chapter.artifacts as artifact}
                        <article class="rounded-[1.2rem] border border-border/80 bg-background/30">
                          <div class="px-4 py-4">
                            <div class="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h4 class="text-base text-foreground">{artifact.label}</h4>
                                <p class="mt-2 text-sm leading-7 text-secondary-foreground">{artifact.note}</p>
                              </div>
                              <a
                                href={artifact.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="shrink-0 text-sm font-medium text-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground"
                              >
                                Open artifact
                              </a>
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
                    <h3 class="text-lg text-foreground">Evidence</h3>
                    <div class="mt-4 space-y-4">
                      {#each chapter.evidenceSections as section}
                        <details class="rounded-[1.2rem] border border-border/80 bg-background/30">
                          <summary class="cursor-pointer list-none px-4 py-4">
                            <span class="block text-base text-foreground">{section.title}</span>
                            <span class="mt-2 block text-sm leading-7 text-secondary-foreground">
                              {section.summary}
                            </span>
                          </summary>
                          <div class="border-t border-border/60 px-4 py-4">
                            <ul class="space-y-3">
                              {#each section.items as item}
                                <li class="text-sm leading-7 text-secondary-foreground">{item}</li>
                              {/each}
                            </ul>
                            {#if section.code}
                              <pre class="mt-4 overflow-x-auto rounded-xl border border-border/60 bg-background/40 px-4 py-4 font-mono text-xs leading-relaxed text-secondary-foreground"><code>{section.code}</code></pre>
                            {/if}
                          </div>
                        </details>
                      {/each}
                    </div>
                  </section>

                  <section>
                    <h3 class="text-lg text-foreground">Limitations</h3>
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
          <h2 class="text-2xl text-foreground sm:text-3xl">Current repo status</h2>
          <div class="mt-4 rounded-[1.2rem] border border-border/80 bg-card/70 px-4 py-4 sm:px-6">
            <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{data.currentRepoStatus.label}</p>
            <p class="mt-3 text-sm font-medium text-foreground">{data.currentRepoStatus.title}</p>
            <p class="mt-3 text-sm leading-7 text-secondary-foreground">{data.currentRepoStatus.body}</p>
          </div>
        </section>
      </div>
    </div>
  </section>
</main>
