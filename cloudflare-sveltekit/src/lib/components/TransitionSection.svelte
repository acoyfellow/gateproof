<script lang="ts">
  import { onMount } from 'svelte';
  
  let mounted = $state(false);
  let scrollProgress = $state(0);
  let containerRef: HTMLDivElement;
  
  onMount(() => {
    mounted = true;
    
    const handleScroll = () => {
      if (!containerRef) return;
      const rect = containerRef.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate how far through the section we've scrolled
      const progress = Math.max(0, Math.min(1, (windowHeight - rect.top) / (windowHeight + rect.height)));
      scrollProgress = progress;
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  });
</script>

{#if mounted}
  <section 
    bind:this={containerRef}
    class="relative min-h-screen flex items-center justify-center overflow-hidden"
  >
    <!-- Split background - Hell on left, Heaven on right -->
    <div
      class="absolute inset-0"
      style="background: linear-gradient(90deg, 
        oklch(0.05 0.03 25) 0%, 
        oklch(0.03 0.01 30) 30%,
        oklch(0.08 0.02 60) 50%,
        oklch(0.85 0.03 85) 70%,
        oklch(0.95 0.02 90) 100%
      );"
    ></div>
    
    <!-- Central threshold visualization -->
    <div class="relative flex flex-col items-center gap-8 px-4 z-10">
      <div class="flex items-center gap-4 sm:gap-8 md:gap-16">
        <!-- Hell side - chaos symbol -->
        <div
          class="transition-opacity duration-1000"
          style="opacity: {1 - scrollProgress};"
        >
          <div class="w-16 h-16 sm:w-24 sm:h-24 border-4 border-red-500 rounded-full flex items-center justify-center">
            <span class="text-red-400 text-2xl sm:text-4xl">⚡</span>
          </div>
        </div>
        
        <!-- Central gate/threshold -->
        <div class="relative">
          <div
            class="w-32 h-32 sm:w-48 sm:h-48 border-4 border-amber-400 rounded-lg flex items-center justify-center transition-all duration-1000"
            style="transform: scale({0.8 + scrollProgress * 0.2}); opacity: {0.5 + scrollProgress * 0.5};"
          >
            <div class="w-20 h-20 sm:w-32 sm:h-32 border-2 border-amber-300 rounded"></div>
          </div>
        </div>
        
        <!-- Heaven side - order symbol -->
        <div
          class="transition-opacity duration-1000"
          style="opacity: {scrollProgress};"
        >
          <div class="w-16 h-16 sm:w-24 sm:h-24 border-4 border-amber-300 rounded-full flex items-center justify-center bg-amber-50/20">
            <span class="text-amber-300 text-2xl sm:text-4xl">✨</span>
          </div>
        </div>
      </div>
      
      <p class="text-center text-sm sm:text-base text-gray-300 max-w-md">
        Passing through the threshold from chaos to order
      </p>
    </div>
  </section>
{/if}
