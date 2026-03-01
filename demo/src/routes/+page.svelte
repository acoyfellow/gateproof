<script lang="ts">
  import HeroSection from '$lib/components/HeroSection.svelte';
  import CodeBlock from '$lib/components/CodeBlock.svelte';

  const observeCode = `import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

const provider = CloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken: process.env.CLOUDFLARE_API_TOKEN!,
});

const result = await Gate.run({
  name: "signup-e2e",
  observe: provider.observe({ backend: "analytics", dataset: "worker_logs" }),
  act: [Act.browser({ url: "https://app.example.com/signup" })],
  assert: [Assert.hasAction("user_created"), Assert.noErrors()],
  stop: { maxMs: 15_000 },
});
if (result.status !== "success") process.exit(1);`;

  const prdCode = `import { definePrd, runPrdLoop, createOpenCodeAgent } from "gateproof/prd";

// Set OPENCODE_ZEN_API_KEY or pass apiKey
const agent = createOpenCodeAgent({
  apiKey: process.env.OPENCODE_ZEN_API_KEY,
  model: "gpt-5.3-codex",
});

const prd = definePrd({
  stories: [
    { id: "user-signup", title: "User can sign up", gateFile: "./gates/signup.gate.ts", scope: { allowedPaths: ["src/routes/**"] } },
    { id: "email-verify", title: "Email verification works", gateFile: "./gates/email.gate.ts", dependsOn: ["user-signup"] },
  ],
});

await runPrdLoop(prd, { agent, maxIterations: 7 });`;

  const features = [
	    {
	      title: "Agent gates",
	      description: "Run an agent inside a controlled runtime. Watch what it actually does. The gate fails if it breaks the rules you set.",
	      link: "/docs/how-to/run-an-agent-gate",
	      linkText: "Run an agent gate",
	    },
    {
      title: "PRD-driven loops",
      description: "Define intent as stories with gates. Run them in dependency order. If a gate fails, an agent fixes the code and the loop re-runs — until all gates pass or you hit max iterations.",
      link: "/docs/how-to/run-in-a-loop",
      linkText: "Run in a loop",
    },
    {
      title: "Authority assertions",
      description: "Assert.authority() checks what the agent actually did against what you allowed. Did it commit when forbidden? Spawn child agents? Use a banned tool? The gate fails.",
      link: "/docs/reference/api",
      linkText: "API reference",
    },
  ];
</script>

<svelte:head>
  <title>gateproof - Make prd.ts real</title>
  <meta name="description" content="Write what done looks like in prd.ts, then loop until the gates prove it is real." />
</svelte:head>

<main>
  <HeroSection />

  <section class="max-w-4xl mx-auto px-4 sm:px-8 py-24">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {#each features as feature}
        <div class="rounded-lg border border-border bg-card p-6">
          <h3 class="text-lg font-medium text-foreground" style="font-family: var(--font-display)">{feature.title}</h3>
          <p class="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
          <a href={feature.link} class="mt-4 inline-block text-sm text-accent hover:underline">{feature.linkText}</a>
        </div>
      {/each}
    </div>
  </section>

  <section class="max-w-4xl mx-auto px-4 sm:px-8 pb-24">
    <h2 class="text-2xl sm:text-3xl tracking-tight text-foreground mb-3" style="font-family: var(--font-display)">
      Observe from production
    </h2>
    <p class="text-muted-foreground mb-6 max-w-2xl">
      Point a gate at Cloudflare Analytics or Workers Logs. Run actions (browser, exec), collect logs, assert on evidence.
    </p>
    <div class="rounded-lg border border-border overflow-hidden">
      <div class="flex items-center gap-2 bg-card px-4 py-2.5 border-b border-border">
        <span class="text-xs text-muted-foreground font-mono">gate.ts</span>
      </div>
	      <div class="bg-card/50 p-4">
	        <CodeBlock code={observeCode} language="typescript" wrap={true} />
	      </div>
	    </div>
	  </section>

  <section class="max-w-4xl mx-auto px-4 sm:px-8 pb-24">
    <h2 class="text-2xl sm:text-3xl tracking-tight text-foreground mb-3" style="font-family: var(--font-display)">
      PRD loops
    </h2>
	    <p class="text-muted-foreground mb-6 max-w-2xl">
	      Define stories with gates. The loop keeps fixing the next failing checkpoint until your PRD is true.
	    </p>
    <div class="rounded-lg border border-border overflow-hidden">
      <div class="flex items-center gap-2 bg-card px-4 py-2.5 border-b border-border">
        <span class="text-xs text-muted-foreground font-mono">prd.ts</span>
      </div>
	      <div class="bg-card/50 p-4">
	        <CodeBlock code={prdCode} language="typescript" wrap={true} />
	      </div>
	    </div>
	  </section>
</main>
