<script lang="ts">
  import PrdBuilder from "$lib/components/PrdBuilder.svelte";

  const githubUrl = "https://github.com/acoyfellow/gateproof";
  const npmUrl = "https://www.npmjs.com/package/gateproof";

  interface Props {
    onOpenDocs?: () => void;
  }

  let { onOpenDocs }: Props = $props();
</script>

<section class="relative min-h-screen overflow-hidden">
  <div
    class="absolute inset-0 bg-cover bg-center bg-no-repeat"
    style="background-image: url('/hero.jpg');"
  >
    <div class="absolute inset-0 bg-black/35"></div>
    <div class="absolute inset-0 bg-linear-to-br from-black/80 via-transparent to-black/20"></div>
  </div>

  <div class="relative z-10 w-full max-w-5xl px-4 sm:px-8 pt-28 pb-24 mx-auto">
    <div class="grid items-start gap-10 lg:grid-cols-[0.9fr,1.1fr]">
      <div class="flex flex-col gap-6">
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

        <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight text-balance">
          <span class="text-amber-300">prd.ts</span> as backlog, state model, and gatekeeper.
        </h1>

        <p class="text-base sm:text-lg text-white/75 max-w-xl text-balance">
          Agents use <span class="font-mono text-white/90">prd.ts</span> + gate files to build in reverse: define expected behavior, then verify it.
        </p>

      

        
          <div class="items-center gap-6 rounded border border-white/15 bg-black/75 px-3 py-2 text-white/90 backdrop-blur-xl p-6 *:p-6">
            <div class=""> 
              <span class="text-xs uppercase tracking-widest text-white/60 select-none">1) Install</span>
              <div>
                <span class="text-sm font-mono">npx gateproof prdts</span>
                <span class="select-none text-sm font-mono text-gray-500"># paste a prompt, get prd.ts</span>
              </div>
            </div>
          
            <div class=""> 
              <span class="text-xs uppercase tracking-widest text-white/60 select-none">2) Use</span>
              <div>
                <span class="text-sm font-mono">bun run prd.ts</span>
                <span class="select-none text-sm font-mono text-gray-500"># pick a task, execute it with your own agent</span>
              </div>
            </div>
          
            <div class=""> 
              <span class="text-xs uppercase tracking-widest text-white/60 select-none">3) Loop</span>
              <div>
                <span class="text-sm font-mono">bun run prd:loop</span>
                <span class="select-none text-sm font-mono text-gray-500"># agent fixes, gates re-run, loop until all gates pass</span>
              </div>
            </div>
          </div>
        

        
      </div>     
    </div>
  </div>
</section>


