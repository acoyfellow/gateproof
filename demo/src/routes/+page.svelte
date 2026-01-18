<script lang="ts">
  import HeroSection from '$lib/components/HeroSection.svelte';
  import ChaosSection from '$lib/components/ChaosSection.svelte';
  import TransitionSection from '$lib/components/TransitionSection.svelte';
  import HeavenSection from '$lib/components/HeavenSection.svelte';
  import PatternsSection from '$lib/components/PatternsSection.svelte';
  import CTASection from '$lib/components/CTASection.svelte';
  import LogoMark from '$lib/components/LogoMark.svelte';
  import InfoDrawer from '$lib/components/InfoDrawer.svelte';
  
  let infoOpen = $state(false);
  let demoRef: HTMLElement;
  
  function openInfoDrawer() {
    infoOpen = true;
  }
  
  function closeInfoDrawer() {
    infoOpen = false;
  }
  
  function scrollToDemo() {
    const demoSection = document.querySelector('section:nth-of-type(4)');
    demoSection?.scrollIntoView({ behavior: 'smooth' });
  }
</script>

<svelte:head>
  <title>gateproof - The observation layer for building software in reverse</title>
  <meta name="description" content="Define constraints. Let AI build within them. Validate against reality." />
</svelte:head>

<main class="relative" style="background: var(--color-background);">
  <HeroSection onInfoClick={openInfoDrawer} />
  <ChaosSection />
  <TransitionSection />
  <HeavenSection onInfoClick={openInfoDrawer} />
  <PatternsSection />
  <CTASection onDemoClick={scrollToDemo} onInfoClick={openInfoDrawer} />
  <InfoDrawer isOpen={infoOpen} onClose={closeInfoDrawer} />
</main>
