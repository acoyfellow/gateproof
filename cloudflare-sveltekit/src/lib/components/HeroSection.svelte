<script lang="ts">
  import { onMount } from 'svelte';
  // Icons will be simple SVG or removed for now
  
  interface Props {
    onInfoClick?: () => void;
  }
  
  let { onInfoClick }: Props = $props();
  
  let mounted = $state(false);
  
  onMount(() => {
    mounted = true;
  });
  
  function scrollToNext() {
    const nextSection = document.querySelector('section:nth-of-type(2)');
    nextSection?.scrollIntoView({ behavior: 'smooth' });
  }
</script>

<section class="relative min-h-screen flex items-center justify-center overflow-hidden">
  <!-- Full bleed background image -->
  <div 
    class="absolute inset-0 bg-cover bg-center bg-no-repeat"
    style="background-image: url('/hero.jpg');"
  >
    <!-- Dark overlay for text readability -->
    <div class="absolute inset-0 bg-black/60"></div>
  </div>
  
  <!-- Content -->
  <div class="relative z-10 flex flex-col items-center gap-6 px-4 text-center">
    {#if mounted}
      <h1 
        class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white type-reveal"
        style="animation-delay: 0.2s;"
      >
        gateproof
      </h1>
      
      <p 
        class="text-sm sm:text-base md:text-lg max-w-2xl text-gray-200 type-reveal"
        style="animation-delay: 0.4s;"
      >
        The observation layer for building software in reverse. Define constraints. Let AI build within them. Validate against reality.
      </p>
      
      <button
        on:click={() => onInfoClick?.()}
        class="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 transition-colors rounded type-reveal"
        style="animation-delay: 0.6s;"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
        <span>Learn more</span>
      </button>
    {/if}
  </div>
  
  <!-- Scroll hint -->
  <div 
    class="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 type-reveal"
    style="animation-delay: 0.8s;"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-400 animate-bounce">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  </div>
</section>

<style>
  .type-reveal {
    opacity: 0;
    animation: type-reveal 0.5s ease-out forwards;
  }
</style>
