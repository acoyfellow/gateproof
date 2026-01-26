<script lang="ts">
  import HeroSection from '$lib/components/HeroSection.svelte';
  import InfoDrawer from '$lib/components/InfoDrawer.svelte';
  import PrdBuilder from '$lib/components/PrdBuilder.svelte';
  
  let docsOpen = $state(false);
</script>

<svelte:head>
  <title>gateproof - Make progress falsifiable</title>
  <meta name="description" content="Agent-first PRD workflow. Define intent in prd.ts, verify reality with gates, and ship with evidence." />
</svelte:head>

<main class="relative" style="background: var(--color-background);">
  <HeroSection onOpenDocs={() => (docsOpen = true)} />
  <PrdBuilder compact sectionId="prd-demo" />
  <InfoDrawer isOpen={docsOpen} onClose={() => (docsOpen = false)} />
</main>
