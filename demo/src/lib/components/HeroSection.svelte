<script lang="ts">
  import CodeBlock from "$lib/components/CodeBlock.svelte";

  interface Props {
    onInfoClick?: () => void;
  }
  
  let { onInfoClick }: Props = $props();

  const githubUrl = "https://github.com/acoyfellow/gateproof";
  const npmUrl = "https://www.npmjs.com/package/gateproof";

  const wow = `import { Gate, Act, Assert } from "gateproof"
import { CloudflareProvider } from "gateproof/cloudflare"

const Provider = CloudflareProvider({ accountId, apiToken });

await Gate.run({ 
  name: "smoke-test",
  observe: Provider.observe({ backend: "analytics", dataset: "worker_logs" }), 
  act: [ Act.wait(250) ], 
  assert: [ Assert.noErrors() ],
  stop: { idleMs: 3000, maxMs: 10000 }
})`;
</script>

<section class="relative min-h-screen flex items-center justify-center py-40">
  <!-- Full bleed background image -->
  <div 
    class="absolute inset-0 bg-cover bg-center bg-no-repeat"
    style="background-image: url('/hero.jpg');"
  >
    <!-- Dark overlay for text readability -->
    <div class="absolute inset-0 bg-black/15 bg-linear-to-l from-black via-black/10 to-transparent"></div>
  </div>
  
  <!-- Content -->
  <div class="relative z-10 w-full max-w-6xl px-4 sm:px-8">
    <div class="grid items-center gap-10 lg:grid-cols-[1fr,420px]">
      <div class="flex flex-col items-start gap-7 text-left">
        <div class="flex flex-wrap items-center gap-2">
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-sm text-white/90 backdrop-blur-xl transition hover:border-white/30 hover:bg-black/30"
            aria-label="gateproof on GitHub"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-white/85 transition group-hover:text-white" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 .5C5.73.5.75 5.6.75 12c0 5.14 3.17 9.5 7.57 11.04.55.1.75-.25.75-.54 0-.27-.01-1.16-.02-2.1-3.08.68-3.73-1.2-3.73-1.2-.5-1.31-1.22-1.66-1.22-1.66-1-.7.08-.69.08-.69 1.1.08 1.68 1.16 1.68 1.16.98 1.72 2.57 1.22 3.2.93.1-.73.38-1.22.69-1.5-2.46-.29-5.05-1.26-5.05-5.6 0-1.24.43-2.25 1.15-3.04-.12-.29-.5-1.47.11-3.07 0 0 .94-.31 3.08 1.16.89-.25 1.85-.38 2.8-.38.95 0 1.91.13 2.8.38 2.14-1.47 3.08-1.16 3.08-1.16.61 1.6.23 2.78.11 3.07.71.79 1.15 1.8 1.15 3.04 0 4.35-2.6 5.31-5.07 5.6.39.35.74 1.03.74 2.08 0 1.5-.01 2.72-.01 3.09 0 .3.2.65.76.54 4.4-1.54 7.57-5.9 7.57-11.04C23.25 5.6 18.27.5 12 .5Z"
              />
            </svg>
            <span class="font-medium">GitHub</span>
            <span class="text-white/55">acoyfellow/gateproof</span>
          </a>

          <a
            href={npmUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-sm text-white/90 backdrop-blur-xl transition hover:border-white/30 hover:bg-black/30"
            aria-label="gateproof on npm"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-white/85 transition group-hover:text-white" aria-hidden="true">
              <path
                fill="currentColor"
                d="M1.5 7.2v9.6h7.2v1.6h3.2v-1.6h10.6V7.2H1.5Zm19.2 8H17V9.8h-4.8v5.4h-3.2V9.8H4.7v5.4H3.1V8.6h17.6v6.6Z"
              />
            </svg>
            <span class="font-medium">npm</span>
            <span class="text-white/55">gateproof</span>
          </a>
        </div>

        <h1 class="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-tight">
          <img src="/logo.svg" alt="gateproof" class="w-auto h-28 sm:h-32 inline-block drop-shadow-[0_12px_40px_rgba(0,0,0,0.55)]" />
          <span class="sr-only">gateproof</span>
        </h1>

        <p class="text-lg sm:text-2xl md:text-3xl max-w-3xl text-gray-100 leading-relaxed text-balance text-shadow-lg">
          Write your stories with gateproof. <br />
          Make your PRD executable. <br />
          Reality decides when you can move forward.
        </p>

        <p class="text-sm sm:text-base max-w-2xl text-white/70 leading-relaxed">
          Agents can’t fix what they can’t observe. Give them real logs — and a contract to assert against.
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white">
            Observe
          </span>
          <span class="inline-flex items-center rounded-full border border-white/12 bg-black/20 px-3 py-1 text-xs tracking-wide text-white/75">
            Act
          </span>
          <span class="inline-flex items-center rounded-full border border-white/12 bg-black/20 px-3 py-1 text-xs tracking-wide text-white/75">
            Assert
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            onclick={() => onInfoClick?.()}
            class="px-6 py-3 text-base text-white border-2 border-white/30 hover:border-white/60 transition-colors rounded backdrop-blur-2xl"
          >
            Learn more
          </button>

          <div class="inline-flex items-center gap-2 rounded border border-white/15 bg-black/25 px-3 py-2 text-white/90 backdrop-blur-xl">
            <span class="text-xs uppercase tracking-widest text-white/60">Install</span>
            <span class="text-sm font-mono">bun add gateproof</span>
          </div>
        </div>
      </div>

      <div class="relative">
        <div class="absolute -inset-4 rounded-[28px] bg-linear-to-br from-white/10 via-transparent to-white/5 blur-xl"></div>
        <div class="relative rounded-2xl border border-white/15 bg-black/25 p-5 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
          <div class="flex items-center justify-between gap-4">
            <div class="min-w-0">
              <p class="text-sm font-semibold tracking-wide text-white/90">Quick start</p>
              <p class="mt-0.5 text-xs text-white/60">Install. Run a gate. Get evidence.</p>
            </div>
            
          </div>

          <div class="mt-4 rounded-xl border border-white/10 bg-black/35 p-4 shadow-inner overflow-hidden">
            <CodeBlock code={wow} language="typescript" wrap />
          </div>

          <p class="mt-3 text-xs text-white/60">
            gates are tiny. evidence is real.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>
