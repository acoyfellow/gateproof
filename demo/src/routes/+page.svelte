<script lang="ts">
  import HeroSection from '$lib/components/HeroSection.svelte';
  import PatternsSection from '$lib/components/PatternsSection.svelte';
  import InfoDrawer from '$lib/components/InfoDrawer.svelte';
  import LiveDemo from '$lib/components/LiveDemo.svelte';
  import DualitySection from '$lib/components/DualitySection.svelte';

  let docsOpen = $state(false);
</script>

<svelte:head>
  <title>gateproof - Make progress falsifiable</title>
  <meta name="description" content="Agent-first proof: PRD defines intent, gates verify reality, and CI ships only with evidence." />
</svelte:head>

<main class="relative" style="background: var(--color-background);">
  <HeroSection onOpenDocs={() => (docsOpen = true)} />
  <LiveDemo />
  <DualitySection />
  <PatternsSection />
  <InfoDrawer isOpen={docsOpen} onClose={() => (docsOpen = false)} />
</main>
