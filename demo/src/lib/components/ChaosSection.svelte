<section class="relative min-h-screen flex items-center justify-center py-20">
  <!-- Full bleed background image -->
  <div 
    class="absolute inset-0 bg-cover bg-center bg-no-repeat"
    style="background-image: url('/chaos.jpg');"
  >
    <!-- Dark overlay for text readability -->
    <div class="absolute inset-0 bg-black/10 bg-linear-to-l from-black via-black/10 to-transparent"></div>
  </div>
  
  <!-- Content -->
  <div class="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 text-center">
    <h2 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-8 text-white leading-tight">
      The Chaos
    </h2>
    
    <p class="text-xl sm:text-2xl md:text-3xl text-gray-100 mb-8 max-w-3xl mx-auto leading-relaxed text-balance text-shadow-lg">
      Without gates, progress is declared, not proven. Stories marked "done" without verification. 
      Work proceeds on assumptions. Reality diverges from intention.
    </p>
    
    <div class="mb-12 text-gray-300 font-mono text-shadow-lg font-extrabold tracking-wide text-2xl md:text-4xl bg-black/50 p-4 backdrop-blur-sm rounded-lg border border-black/10">
      observe → fail → <span class="text-red-400 line-through">fix</span> → <span class="text-red-400 line-through">accept</span>
    </div>
    
    <div class="mb-12 max-w-4xl mx-auto p-6 bg-red-950/60 border border-red-800/70 rounded backdrop-blur-sm">
      <p class="text-lg text-red-100 mb-3 font-semibold">The trap:</p>
      <p class="text-base text-red-200/90 leading-relaxed">
        Story marked "done". Next story starts. Assumption: previous story works. It doesn't. Work continues. System breaks. 
        You discover the failure weeks later, when assumptions have compounded into cascading failures.
      </p>
    </div>
    
    <div class="grid sm:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {#each [
        { title: "Dishonest progress", desc: "Stories marked done without proof" },
        { title: "Assumptions compound", desc: "Work builds on unverified claims" },
        { title: "No verification", desc: "Reality diverges from intention" }
      ] as item}
        <div class="p-8 bg-red-950/40 border border-red-800/50 rounded backdrop-blur-sm">
          <p class="text-2xl font-semibold text-red-100 mb-2">{item.title}</p>
          <p class="text-lg text-red-200/80">{item.desc}</p>
        </div>
      {/each}
    </div>
  </div>
</section>
