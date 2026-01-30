<script lang="ts">
  import HeroSection from '$lib/components/HeroSection.svelte';
  import PatternsSection from '$lib/components/PatternsSection.svelte';
  import InfoDrawer from '$lib/components/InfoDrawer.svelte';
  import LiveDemo from '$lib/components/LiveDemo.svelte';

  let docsOpen = $state(false);
</script>

<svelte:head>
  <title>gateproof - Make progress falsifiable</title>
  <meta name="description" content="Agent-first PRD workflow. Define intent in prd.ts, verify reality with gates, and ship with evidence." />
</svelte:head>

<main class="relative" style="background: var(--color-background);">
  <HeroSection onOpenDocs={() => (docsOpen = true)} />
  <PatternsSection />
  <LiveDemo />
  <InfoDrawer isOpen={docsOpen} onClose={() => (docsOpen = false)} />
</main>
