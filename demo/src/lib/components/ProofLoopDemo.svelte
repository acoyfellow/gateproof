<script lang="ts">
  import { onMount } from "svelte";
  import {
    PROOF_DEMO_NOTE,
    proofDemoSteps,
    type ProofDemoTone,
  } from "$lib/proof-demo";

  let active = $state(0);
  let paused = $state(false);
  let reduceMotion = $state(false);

  const last = proofDemoSteps.length - 1;

  function go(index: number) {
    active = Math.max(0, Math.min(last, index));
  }

  function toneClass(tone: ProofDemoTone | undefined): string {
    if (tone === "fail") return "text-red-400";
    if (tone === "warn") return "text-amber-300";
    if (tone === "pass") return "text-emerald-400";
    return "text-muted-foreground";
  }

  onMount(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reduceMotion = media.matches;
      if (reduceMotion) paused = true;
    };
    sync();
    media.addEventListener("change", sync);

    const timer = window.setInterval(() => {
      if (paused || reduceMotion) return;
      active = active === last ? 0 : active + 1;
    }, 3200);

    return () => {
      media.removeEventListener("change", sync);
      window.clearInterval(timer);
    };
  });

  const step = $derived(proofDemoSteps[active] ?? proofDemoSteps[0]);
</script>

<div class="overflow-hidden rounded-[2rem] border border-border/80 bg-card/75 shadow-2xl shadow-black/30 backdrop-blur-sm">
  <div class="border-b border-border/70 px-5 py-4 sm:px-6">
    <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">proof loop</p>
    <h2 class="mt-3 max-w-3xl text-2xl leading-tight text-foreground sm:text-4xl">
      The agent may change the implementation. It may not change the proof.
    </h2>
    <p class="mt-3 max-w-3xl text-sm leading-7 text-secondary-foreground sm:text-base">
      Fail, attempt, reject a <code class="text-foreground">plan.ts</code> edit, retry inside
      <code class="text-foreground">examples/hello-world/</code>, then pass. Same contract the whole way.
    </p>
  </div>

  <div class="grid gap-0 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
    <ol class="border-b border-border/70 p-3 lg:border-b-0 lg:border-r" aria-label="Proof loop steps">
      {#each proofDemoSteps as item, index}
        <li>
          <button
            type="button"
            class="flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors {index === active
              ? 'bg-background/70 text-foreground'
              : 'text-muted-foreground hover:bg-background/40 hover:text-foreground'}"
            aria-current={index === active ? "step" : undefined}
            onclick={() => {
              go(index);
              paused = true;
            }}
          >
            <span class="mt-0.5 font-mono text-[11px] text-accent">{String(index + 1).padStart(2, "0")}</span>
            <span>{item.title.replace(/^\d+\.\s/, "")}</span>
          </button>
        </li>
      {/each}
    </ol>

    <div class="p-4 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm font-medium text-foreground">{step.title}</p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
            onclick={() => {
              paused = !paused;
            }}
            disabled={reduceMotion}
          >
            {reduceMotion ? "static" : paused ? "play" : "pause"}
          </button>
        </div>
      </div>
      <p class="mt-2 text-sm leading-6 text-secondary-foreground">{step.caption}</p>

      <div class="mt-4 grid gap-2 sm:grid-cols-2">
        <p class="rounded-xl border border-border/70 bg-background/40 px-3 py-2 text-xs leading-5 text-secondary-foreground">
          <span class="block uppercase tracking-[0.16em] text-muted-foreground">implementation</span>
          {step.implementation}
        </p>
        <p class="rounded-xl border border-border/70 bg-background/40 px-3 py-2 text-xs leading-5 text-secondary-foreground">
          <span class="block uppercase tracking-[0.16em] text-muted-foreground">contract</span>
          {step.contract}
        </p>
      </div>

      <div
        class="mt-4 overflow-x-auto rounded-2xl border border-border/70 bg-[#0c0a09] p-4 font-mono text-xs leading-6"
        role="status"
        aria-live="polite"
      >
        {#each step.lines as line}
          <p class={toneClass(line.tone)}>{line.text}</p>
        {/each}
      </div>
      <p class="mt-3 text-[11px] leading-5 text-muted-foreground">{PROOF_DEMO_NOTE}</p>
    </div>
  </div>
</div>
