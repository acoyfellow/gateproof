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
    <div class="absolute inset-0 bg-black/10 bg-linear-to-l from-black via-black/10 to-transparent"></div>
  </div>
  
  <!-- Content -->
  <div class="relative z-10 flex flex-col items-start gap-8 px-4 text-left max-3xl mx-auto">
    <h1 class="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-tight">
      <img src="/logo.svg" alt="gateproof" class="w-auto h-32 inline-block" />
      <span class="sr-only">gateproof</span>
    </h1>
    
    <p class="text-lg sm:text-2xl md:text-3xl max-w-3xl text-gray-100 leading-relaxed text-balance text-shadow-lg">
      The observation layer for building software in reverse. <br />
      Define constraints. <br />
      Let AI build within them. <br />
      Validate against reality.
    </p>
    
    <button
      onclick={() => onInfoClick?.()}
      class="px-6 py-3 text-base text-white border-2 border-white/30 hover:border-white/60 transition-colors rounded backdrop-blur-2xl"
    >
      Learn more
    </button>
  </div>
</section>
