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
    
    <p class="text-xl sm:text-2xl md:text-3xl text-gray-100 mb-12 max-w-3xl mx-auto leading-relaxed text-balance text-shadow-lg">
      Without gateproof, AI-generated code runs unchecked. Errors cascade. 
      Systems fail silently. Reality diverges from expectations.
    </p>
    
    <div class="grid sm:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {#each [
        { title: "Unpredictable behavior", desc: "Code runs without validation" },
        { title: "Cascading failures", desc: "Errors propagate unchecked" },
        { title: "No validation", desc: "Reality diverges from code" }
      ] as item}
        <div class="p-8 bg-red-950/40 border border-red-800/50 rounded backdrop-blur-sm">
          <p class="text-2xl font-semibold text-red-100 mb-2">{item.title}</p>
          <p class="text-lg text-red-200/80">{item.desc}</p>
        </div>
      {/each}
    </div>
  </div>
</section>
