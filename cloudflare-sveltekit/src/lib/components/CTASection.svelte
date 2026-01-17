<script lang="ts">
  // Icons as SVG
  
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

<section class="relative min-h-screen flex items-center justify-center w-full px-4 sm:px-6">
  <!-- Background -->
  <div
    class="absolute inset-0"
    style="background: radial-gradient(ellipse 60% 60% at 30% 50%, oklch(0.1 0.05 30 / 0.3) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 70% 50%, oklch(0.15 0.04 85 / 0.2) 0%, transparent 60%), oklch(0.03 0.01 30);"
  ></div>
  
  <!-- Converging lines background -->
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <svg class="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGradHell" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="oklch(0.5 0.15 30 / 0.2)" />
          <stop offset="100%" stop-color="transparent" />
        </linearGradient>
        <linearGradient id="lineGradHeaven" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="transparent" />
          <stop offset="100%" stop-color="oklch(0.8 0.1 85 / 0.15)" />
        </linearGradient>
      </defs>
      {#each Array.from({ length: 8 }) as _, i}
        {@const y = 15 + i * 10}
        <line
          x1="0"
          y1={y + '%'}
          x2="100%"
          y2={y + '%'}
          stroke={i < 4 ? 'url(#lineGradHell)' : 'url(#lineGradHeaven)'}
          stroke-width="1"
          opacity="0.3"
        />
      {/each}
    </svg>
  </div>
  
  <!-- Content -->
  <div class="relative z-10 max-w-4xl mx-auto text-center">
    <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-white">
      Take control of AI-generated code
    </h2>
    <p class="text-lg sm:text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
      Define constraints. Validate against reality.
    </p>
    
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
      <button
        on:click={scrollToDemo}
        class="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
      >
        <span>Try the Demo</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>
      
      <a
        href="https://github.com/acoyfellow/gateproof"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-2 px-6 py-3 border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white font-medium rounded-lg transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
          <path d="M9 18c-4.51 2-5-2-7-2"/>
        </svg>
        <span>View on GitHub</span>
      </a>
    </div>
    
    <button
      on:click={() => onInfoClick?.()}
      class="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors mx-auto"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
      </svg>
      <span>Read the documentation</span>
    </button>
  </div>
</section>
