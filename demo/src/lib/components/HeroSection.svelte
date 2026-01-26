<script lang="ts">
  import PrdBuilder from "$lib/components/PrdBuilder.svelte";

  const githubUrl = "https://github.com/acoyfellow/gateproof";
  const npmUrl = "https://www.npmjs.com/package/gateproof";
</script>

<section class="relative min-h-screen overflow-hidden">
  <div
    class="absolute inset-0 bg-cover bg-center bg-no-repeat"
    style="background-image: url('/hero.jpg');"
  >
    <div class="absolute inset-0 bg-black/35"></div>
    <div class="absolute inset-0 bg-linear-to-br from-black/80 via-transparent to-black/20"></div>
  </div>

  <div class="relative z-10 w-full max-w-6xl px-4 sm:px-8 pt-28 pb-24">
    <div class="grid items-start gap-10 lg:grid-cols-[0.9fr,1.1fr]">
      <div class="flex flex-col gap-6">
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80">
            Live PRD demo
          </span>
          <span class="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-200/90">
            Real sandbox
          </span>
        </div>

        <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight">
          A <span class="text-amber-300">PRD</span> is the backlog, the state model, and the gatekeeper.
        </h1>

        <p class="text-base sm:text-lg text-white/75 max-w-xl text-balance">
          Agents use <span class="font-mono text-white/90">prd.ts</span> + gate files to build in reverse: define expected behavior, then verify it.
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs tracking-wide text-white/80">
            Backlog
          </span>
          <span class="inline-flex items-center rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs tracking-wide text-white/70">
            State model
          </span>
          <span class="inline-flex items-center rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs tracking-wide text-white/70">
            Gatekeeper
          </span>
        </div>

        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div class="inline-flex items-center gap-2 rounded border border-white/15 bg-black/35 px-3 py-2 text-white/90 backdrop-blur-xl">
            <span class="text-xs uppercase tracking-widest text-white/60">Install</span>
            <span class="text-sm font-mono">npx gateproof prdts</span>
          </div>
          <div class="inline-flex items-center gap-2 rounded border border-white/15 bg-black/35 px-3 py-2 text-white/90 backdrop-blur-xl">
            <span class="text-xs uppercase tracking-widest text-white/60">Use</span>
            <span class="text-sm font-mono">bun run prd.ts</span>
          </div>
          <div class="inline-flex items-center gap-2 rounded border border-white/15 bg-black/35 px-3 py-2 text-white/90 backdrop-blur-xl">
            <span class="text-xs uppercase tracking-widest text-white/60">Loop</span>
            <span class="text-sm font-mono">bun run prd:loop</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs text-white/70">
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 hover:border-white/40"
          >
            GitHub
          </a>
          <a
            href={npmUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 hover:border-white/40"
          >
            npm
          </a>
        </div>
      </div>

      <div class="relative">
        <div class="absolute -inset-6 rounded-[32px] bg-linear-to-br from-amber-200/20 via-white/5 to-transparent blur-2xl"></div>
        <div class="relative rounded-2xl border border-white/15 bg-black/35 p-4 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
          <PrdBuilder compact sectionId="prd-demo" />
        </div>
      </div>
    </div>
  </div>
</section>
