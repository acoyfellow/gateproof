<script lang="ts">
  import HeroSection from '$lib/components/HeroSection.svelte';
  import CodeBlock from '$lib/components/CodeBlock.svelte';

  const agentCode = `import { Gate, Act, Assert } from "gateproof";
import { setFilepathRuntime, CloudflareSandboxRuntime,
         createFilepathObserveResource } from "gateproof";
import { getSandbox } from "@cloudflare/sandbox";

setFilepathRuntime(new CloudflareSandboxRuntime({
  getSandbox: (cfg) => getSandbox(env.Sandbox, \`agent-\${cfg.name}\`),
}));

const result = await Gate.run({
  name: "fix-auth-bug",
  observe: createFilepathObserveResource(container, "fix-auth"),
  act: [Act.agent({
    agent: "claude-code",
    task: "Fix the null pointer in src/auth.ts",
    timeoutMs: 300_000,
  })],
  assert: [
    Assert.hasAction("commit"),
    Assert.hasAction("done"),
    Assert.authority({
      canCommit: true,
      canSpawn: false,
      forbiddenTools: ["delete_file"],
    }),
  ],
});`;

  const prdCode = `import { definePrd, runPrdLoop, createOpenCodeAgent } from "gateproof/prd";

const prd = definePrd({
  stories: [
    {
      id: "user-signup",
      title: "User can sign up — evidence: user_created",
      gateFile: "./gates/signup.gate.ts",
      scope: { allowedPaths: ["src/routes/**"], maxChangedFiles: 5 },
    },
    {
      id: "email-verify",
      title: "Email verification works — evidence: email_sent",
      gateFile: "./gates/email.gate.ts",
      dependsOn: ["user-signup"],
    },
  ] as const,
});

await runPrdLoop(prd, {
  agent: createOpenCodeAgent({ model: "big-pickle" }),
  maxIterations: 7,
  autoCommit: true,
});`;

  const shorthandCode = `import {
  gate, commandGate, browserGate,
  noErrors, hasAction, browserAct, cloudflare,
} from "gateproof/shorthands";

// One-liner: run a command, check exit code
await commandGate("build", "bun run build");

// Browser gate with Cloudflare log observation
await browserGate("homepage", "https://app.example.com", {
  observe: cloudflare.logs({ dataset: "worker_logs" }),
  assert: [hasAction("page_loaded"), noErrors()],
});`;

  const features = [
    {
      title: "Agent gates",
      description: "Spawn AI agents in isolated Cloudflare Sandbox containers. Observe their NDJSON event stream. Assert governance policies against their actual behavior — commits, tool calls, spawns.",
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
    {
      title: "Shorthands",
      description: "gate(), commandGate(), browserGate() — write gates with less boilerplate. Flat assertions, action helpers, and Cloudflare observe helpers that read credentials from env.",
      link: "/docs/how-to/use-shorthands",
      linkText: "Use shorthands",
    },
  ];
</script>

<svelte:head>
  <title>gateproof - Make agent work falsifiable</title>
  <meta name="description" content="prd.ts defines intent, gates verify reality, CI ships only with evidence." />
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
      Agent gates
    </h2>
    <p class="text-muted-foreground mb-6 max-w-2xl">
      Spawn an agent in a container, observe its behavior via NDJSON, and assert it stayed within bounds.
    </p>
    <div class="rounded-lg border border-border overflow-hidden">
      <div class="flex items-center gap-2 bg-card px-4 py-2.5 border-b border-border">
        <span class="text-xs text-muted-foreground font-mono">agent-gate.ts</span>
      </div>
      <div class="bg-card/50 p-4">
        <CodeBlock code={agentCode} language="typescript" />
      </div>
    </div>
  </section>

  <section class="max-w-4xl mx-auto px-4 sm:px-8 pb-24">
    <h2 class="text-2xl sm:text-3xl tracking-tight text-foreground mb-3" style="font-family: var(--font-display)">
      PRD loops
    </h2>
    <p class="text-muted-foreground mb-6 max-w-2xl">
      Define stories with gates. An agent iterates until every gate passes.
    </p>
    <div class="rounded-lg border border-border overflow-hidden">
      <div class="flex items-center gap-2 bg-card px-4 py-2.5 border-b border-border">
        <span class="text-xs text-muted-foreground font-mono">prd.ts</span>
      </div>
      <div class="bg-card/50 p-4">
        <CodeBlock code={prdCode} language="typescript" />
      </div>
    </div>
  </section>

  <section class="max-w-4xl mx-auto px-4 sm:px-8 pb-24">
    <h2 class="text-2xl sm:text-3xl tracking-tight text-foreground mb-3" style="font-family: var(--font-display)">
      Shorthands
    </h2>
    <p class="text-muted-foreground mb-6 max-w-2xl">
      Less boilerplate for common patterns.
    </p>
    <div class="rounded-lg border border-border overflow-hidden">
      <div class="flex items-center gap-2 bg-card px-4 py-2.5 border-b border-border">
        <span class="text-xs text-muted-foreground font-mono">gates.ts</span>
      </div>
      <div class="bg-card/50 p-4">
        <CodeBlock code={shorthandCode} language="typescript" />
      </div>
    </div>
  </section>
</main>
