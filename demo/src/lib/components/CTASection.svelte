<script lang="ts">
  interface Props {
    onDemoClick?: () => void;
    onInfoClick?: () => void;
  }
  
  let { onDemoClick, onInfoClick }: Props = $props();
  
  function scrollToDemo() {
    const demoSection = document.querySelector('section:nth-of-type(4)');
    demoSection?.scrollIntoView({ behavior: 'smooth' });
    onDemoClick?.();
  }
</script>

<section class="relative min-h-screen flex items-center justify-center w-full px-4 sm:px-6 text-balance">
  <!-- Full bleed background image -->
  <div 
    class="absolute inset-0 bg-cover bg-center bg-no-repeat"
    style="background-image: url('/cta.jpg');"
  >
    <!-- Dark overlay for text readability -->
    <div class="absolute inset-0 bg-white/50"></div>
  </div>
  
  <!-- Content -->
  <div class="relative z-10 max-w-4xl mx-auto text-center">
    <h2 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-8 text-black leading-tigher">
      Take control of AI-generated code
    </h2>
    <p class="text-xl sm:text-2xl md:text-3xl text-gray-900 mb-12 max-w-3xl mx-auto leading-tighter">
      Define constraints. Validate against reality.
    </p>
    
    <div class="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10">
      <button
        onclick={scrollToDemo}
        class="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-black text-lg font-medium rounded-lg transition-colors"
      >
        Try the Demo
      </button>
      
      <a
        href="https://github.com/acoyfellow/gateproof"
        target="_blank"
        rel="noopener noreferrer"
        class="px-8 py-4 border-2 border-black/30 hover:border-black/60 text-black text-lg font-medium rounded-lg transition-colors"
      >
        View on GitHub
      </a>
    </div>
    
    <button
      onclick={() => onInfoClick?.()}
      class="text-base text-gray-800 hover:text-black transition-colors"
    >
      Read the documentation
    </button>
  </div>
</section>
