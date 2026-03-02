<script lang="ts">
  import CodeBlock from '$lib/components/CodeBlock.svelte';
</script>

<svelte:head>
  <title>Type reference - gateproof</title>
</svelte:head>

<div class="min-h-screen p-8 max-w-2xl mx-auto">
  <a href="/" class="text-sm opacity-50 hover:opacity-80 transition-opacity">&larr; back</a>

  <h1 class="text-lg mt-6 mb-8 opacity-70">type reference</h1>

  <section class="mb-10">
    <h2 class="text-xs uppercase tracking-widest opacity-40 mb-3">ScopeFile</h2>
    <CodeBlock code={`type ScopeFile = {
  spec: SpecDefinition;
  plan: PlanDefinition;
};`} />
  </section>

  <section class="mb-10">
    <h2 class="text-xs uppercase tracking-widest opacity-40 mb-3">SpecDefinition</h2>
    <CodeBlock code={`type SpecDefinition = {
  title: string;
  tutorial: { goal: string; outcome: string };
  howTo: { task: string; done: string };
  explanation: { summary: string };
};`} />
  </section>

  <section class="mb-10">
    <h2 class="text-xs uppercase tracking-widest opacity-40 mb-3">PlanDefinition</h2>
    <CodeBlock code={`type PlanDefinition = {
  goals: readonly PlanGoal[];
  loop?: {
    maxIterations?: number;
    stopOnFailure?: boolean;
  };
};`} />
  </section>

  <section class="mb-10">
    <h2 class="text-xs uppercase tracking-widest opacity-40 mb-3">PlanGoal</h2>
    <CodeBlock code={`type PlanGoal = {
  id: string;
  title: string;
  gate: GateDefinition;
};`} />
  </section>

  <section class="mb-10">
    <h2 class="text-xs uppercase tracking-widest opacity-40 mb-3">GateStatus</h2>
    <CodeBlock code={`type VerificationResult = {
  status: "pass" | "fail" | "skip" | "inconclusive";
  proofStrength: "strong" | "moderate" | "weak" | "none";
};`} />
  </section>

  <p class="text-xs opacity-30 mt-12">
    source: src/index.ts
  </p>
</div>
