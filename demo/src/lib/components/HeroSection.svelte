<script lang="ts">
  const githubUrl = "https://github.com/acoyfellow/gateproof";
  const npmUrl = "https://www.npmjs.com/package/gateproof";

  interface Props {
    onOpenDocs?: () => void;
  }

  let { onOpenDocs }: Props = $props();
</script>

<section class="relative min-h-[92vh] overflow-hidden">
  <div class="absolute inset-0">
    <div
      class="absolute inset-0"
      style="background: radial-gradient(1200px 600px at 10% 10%, rgba(255,196,77,0.12), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(255,140,0,0.12), transparent 60%), linear-gradient(180deg, #0a0704 0%, #0b0a07 50%, #090808 100%);"
    ></div>
    <div
      class="absolute inset-0 opacity-40"
      style="background-image: linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 48px 48px;"
    ></div>
  </div>

  <div class="relative z-10 w-full max-w-6xl px-4 sm:px-8 pt-24 pb-16 mx-auto">
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
      <a
        href="/types"
        class="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 hover:border-white/40"
      >
        Types
      </a>
      {#if onOpenDocs}
        <button
          type="button"
          onclick={onOpenDocs}
          class="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-amber-200/90 hover:border-amber-300/60"
        >
          Docs
        </button>
      {/if}
    </div>

    <div class="mt-10 grid gap-10 lg:grid-cols-[1.05fr,0.95fr]">
      <div class="flex flex-col gap-6">
        <p class="text-xs uppercase tracking-[0.35em] text-amber-300/80">For tool‑using agents</p>
        <h1 class="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white leading-tight text-balance">
          Your work is only real when it can be proven.
        </h1>
        <p class="text-base sm:text-lg text-white/70 max-w-xl text-balance">
          You get <span class="font-mono text-white/90">prd.ts</span> plus concrete failures. Handlers get evidence. Gateproof is the contract between you and them.
        </p>

        <div class="flex flex-wrap items-center gap-3">
          <a
            href="#demo"
            class="rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_8px_30px_rgba(255,193,77,0.25)] hover:bg-amber-300"
          >
            Run the live demo
          </a>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/90 hover:border-white/50"
          >
            View on GitHub
          </a>
        </div>

        <div class="mt-4 rounded-xl border border-white/10 bg-black/60 p-5">
          <div class="text-xs uppercase tracking-[0.25em] text-white/40">Agent brief</div>
          <div class="mt-3 grid gap-3 text-sm text-white/80">
            <div class="flex items-center gap-3">
              <span class="text-amber-300">Input</span>
              <span><span class="font-mono text-white/90">prd.ts</span> (intent + scope)</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-amber-300">Loop</span>
              <span>Gate fails → fix → re‑run</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-amber-300">Output</span>
              <span>Evidence, not opinions</span>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-white/10 bg-black/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
        <div class="text-xs uppercase tracking-[0.25em] text-white/40">Minimal contract</div>
        <pre class="mt-4 text-xs leading-relaxed text-white/85 font-mono whitespace-pre-wrap">
import { Gate, Act, Assert } from "gateproof";

const result = await Gate.run({
  name: "user-signup",
  observe: provider.observe({ backend: "analytics" }),
  act: [Act.browser({ url: "/signup" })],
  assert: [Assert.hasAction("user_created")],
});
        </pre>
        <div class="mt-4 flex flex-wrap gap-3 text-xs text-white/60">
          <span class="rounded-full border border-white/10 px-3 py-1">Observe</span>
          <span class="rounded-full border border-white/10 px-3 py-1">Act</span>
          <span class="rounded-full border border-white/10 px-3 py-1">Assert</span>
          <span class="rounded-full border border-white/10 px-3 py-1">Evidence‑first</span>
        </div>
      </div>
    </div>
  </div>
</section>
