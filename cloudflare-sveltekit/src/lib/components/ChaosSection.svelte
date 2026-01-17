<script lang="ts">
  import { onMount } from 'svelte';
  // Icons as SVG
  
  let mounted = $state(false);
  let glitchLines = $state<number[]>([]);
  
  onMount(() => {
    mounted = true;
    // Generate random glitch lines
    glitchLines = Array.from({ length: 20 }, () => Math.random() * 100);
    
    // Randomize periodically
    const interval = setInterval(() => {
      glitchLines = Array.from({ length: 20 }, () => Math.random() * 100);
    }, 3000);
    
    return () => clearInterval(interval);
  });
</script>

{#if mounted}
  <section class="relative min-h-screen flex items-center justify-center overflow-hidden">
    <!-- Chaotic red background -->
    <div
      class="absolute inset-0"
      style="background: radial-gradient(ellipse 120% 80% at 30% 20%, oklch(0.25 0.2 25 / 0.4) 0%, transparent 50%), radial-gradient(ellipse 100% 100% at 70% 80%, oklch(0.2 0.18 20 / 0.3) 0%, transparent 50%), oklch(0.03 0.01 25);"
    ></div>
    
    <!-- Glitch lines -->
    {#each glitchLines as top, i}
      <div
        class="absolute w-full h-px"
        style="top: {top}%; background: linear-gradient(90deg, transparent 0%, oklch(0.5 0.2 25 / {0.1 + Math.random() * 0.3}) {Math.random() * 50}%, transparent 100%); transform: translateX({(Math.random() - 0.5) * 20}px);"
      ></div>
    {/each}
    
    <!-- Content -->
    <div class="relative z-10 max-w-4xl mx-auto px-4 text-center">
      <div class="flex justify-center gap-4 mb-6">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-red-400">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <path d="M12 9v4"/>
          <path d="M12 17h.01"/>
        </svg>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-orange-400">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-red-500">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 12h8"/>
          <path d="M12 8v8"/>
        </svg>
      </div>
      
      <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-red-200">
        The Chaos
      </h2>
      
      <p class="text-lg sm:text-xl text-red-300/80 mb-8 max-w-2xl mx-auto">
        Without gateproof, AI-generated code runs unchecked. Errors cascade. 
        Systems fail silently. Reality diverges from expectations.
      </p>
      
      <div class="grid sm:grid-cols-3 gap-4 mt-12">
        <div class="p-6 bg-red-950/30 border border-red-800/50 rounded">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-3 text-red-400">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <path d="M12 9v4"/>
            <path d="M12 17h.01"/>
          </svg>
          <p class="text-sm text-red-200">Unpredictable behavior</p>
        </div>
        <div class="p-6 bg-red-950/30 border border-red-800/50 rounded">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-3 text-orange-400">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <p class="text-sm text-red-200">Cascading failures</p>
        </div>
        <div class="p-6 bg-red-950/30 border border-red-800/50 rounded">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-3 text-red-500">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 12h8"/>
            <path d="M12 8v8"/>
          </svg>
          <p class="text-sm text-red-200">No validation</p>
        </div>
      </div>
    </div>
  </section>
{/if}
