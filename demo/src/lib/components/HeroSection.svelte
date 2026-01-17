<script lang="ts">
  interface Props {
    onInfoClick?: () => void;
  }
  
  let { onInfoClick }: Props = $props();
</script>

<section class="relative min-h-screen flex items-center justify-center overflow-hidden">
  <!-- Full bleed background image -->
  <div 
    class="absolute inset-0 bg-cover bg-center bg-no-repeat"
    style="background-image: url('/hero.jpg');"
  >
    <!-- Dark overlay for text readability -->
    <div class="absolute inset-0 bg-black/10 bg-linear-to-b from-black via-black/50 to-transparent"></div>
  </div>
  
  <!-- Content -->
  <div class="relative z-10 flex flex-col items-center gap-8 px-4 text-center max-w-4xl mx-auto">
    <h1 class="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-tight">
      gateproof
    </h1>
    
    <p class="text-lg sm:text-xl md:text-2xl max-w-3xl text-gray-100 leading-relaxed">
      The observation layer for building software in reverse. Define constraints. Let AI build within them. Validate against reality.
    </p>
    
    <button
      onclick={() => onInfoClick?.()}
      class="px-6 py-3 text-base text-white border-2 border-white/30 hover:border-white/60 transition-colors rounded"
    >
      Learn more
    </button>
  </div>
</section>
