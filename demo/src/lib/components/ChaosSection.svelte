<main>
  <section class="relative min-h-screen overflow-hidden bg-black">
    <div
      class="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
      style="background-image: url('https://gateproof.dev/chaos.jpg');"
    ></div>

    <div class="relative z-10 grid min-h-screen lg:grid-cols-[1fr,1.2fr] max-w-6xl mx-auto">
      <div class="flex flex-col justify-between border-r border-white/10 p-8 md:p-12 lg:p-16">
        <div>
          <p class="font-mono text-xs uppercase tracking-[0.4em] text-red-500">Without gates</p>
        </div>

        <div class="my-12 lg:my-0">
          <h2 class="-ml-1 text-[15vw] font-black leading-[0.85] tracking-tighter text-white lg:text-[10vw]">
            The<br /><span class="text-red-500">Chaos</span>
          </h2>
        </div>

        <div class="space-y-3 font-mono text-sm tracking-wider">
          <div class="flex items-center gap-4">
            <span class="w-20 text-white/40">observe</span><span class="h-px flex-1 bg-white/20"></span>
          </div>
          <div class="flex items-center gap-4">
            <span class="w-20 text-white/40">fail</span><span class="h-px flex-1 bg-white/20"></span>
          </div>
          <div class="flex items-center gap-4">
            <span class="w-20 text-red-500 line-through">fix</span><span class="h-px flex-1 bg-red-500/30"></span>
          </div>
          <div class="flex items-center gap-4">
            <span class="w-20 italic text-red-400">accept</span><span class="h-px flex-1 bg-red-500/30"></span>
          </div>
        </div>
      </div>

      <div class="flex flex-col">
        <div class="border-b border-white/10 p-8 md:p-12 lg:p-16">
          <p class="max-w-lg text-xl font-light leading-relaxed text-white/80 md:text-2xl">
            Progress is <span class="font-medium text-white">declared</span>, not proven. Stories marked "done" without
            verification. Work proceeds on assumptions. <span class="text-red-400">Reality diverges from intention.</span>
          </p>
        </div>

        <div class="flex-1 border-b border-white/10 bg-red-950/30 p-8 md:p-12 lg:p-16">
          <div class="mb-6 flex items-center gap-4">
            <span class="h-px w-8 bg-red-500"></span
            ><span class="font-mono text-xs uppercase tracking-[0.3em] text-red-400">The trap</span>
          </div>
          <p class="max-w-lg text-base leading-loose text-white/60 md:text-lg">
            Story marked "done". Next story starts. Assumption: previous story works. <span class="font-medium text-white/90"
              >It doesn't.</span
            >
            Work continues. System breaks. You discover the failure weeks later, when assumptions have compounded into
            <span class="text-red-400">cascading failures.</span>
          </p>
        </div>

        <div class="grid divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
          <div class="p-6 md:p-8">
            <span class="font-mono text-5xl font-black text-white/10">01</span>
            <p class="mt-2 font-medium text-white">Dishonest progress</p>
            <p class="mt-1 text-sm text-white/40">Stories marked done without proof</p>
          </div>
          <div class="p-6 md:p-8">
            <span class="font-mono text-5xl font-black text-white/10">02</span>
            <p class="mt-2 font-medium text-white">Assumptions compound</p>
            <p class="mt-1 text-sm text-white/40">Work builds on unverified claims</p>
          </div>
          <div class="p-6 md:p-8">
            <span class="font-mono text-5xl font-black text-white/10">03</span>
            <p class="mt-2 font-medium text-white">No verification</p>
            <p class="mt-1 text-sm text-white/40">Reality diverges from intention</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</main>
