<script lang="ts">
  import CodeBlock from './CodeBlock.svelte';

  const githubUrl = "https://github.com/acoyfellow/gateproof";
  const npmUrl = "https://www.npmjs.com/package/gateproof";

  const exampleCode = `import { Gate, Act, Assert } from "gateproof";
import { setFilepathRuntime, CloudflareSandboxRuntime, createFilepathObserveResource } from "gateproof";
import { getSandbox } from "@cloudflare/sandbox";

setFilepathRuntime(new CloudflareSandboxRuntime({
  getSandbox: (cfg) => getSandbox(env.Sandbox, \`agent-\${cfg.name}\`),
}));

const result = await Gate.run({
  name: "waitlist-signup",
  observe: createFilepathObserveResource(container, "waitlist-feature"),
  act: [Act.agent({
    name: "waitlist-feature",
    agent: "claude-code",
    model: "claude-opus-4-6",
    task: "Add the waitlist: landing form that POSTs to /api/waitlist, persist email in KV, show thank-you and current count.",
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
  stop: { maxMs: 300_000 },
});

if (result.status !== "success") process.exit(1);`;
</script>

<section class="relative min-h-[92vh] flex flex-col items-center justify-center px-4 sm:px-8 py-20 overflow-hidden">
  <!-- Background image -->
  <div class="absolute inset-0">
    <img
      src="/hero.jpg"
      alt=""
      class="w-full h-full object-cover opacity-40"
    />
    <div class="absolute inset-0 bg-linear-to-b from-background/60 via-background/40 to-background"></div>
  </div>

  <div class="relative z-10 w-full max-w-xl mx-auto text-center">
    <nav class="flex items-center justify-center gap-5 mb-20">
      <a
        href={githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs tracking-wide text-muted-foreground hover:text-accent transition-colors"
      >
        GitHub
      </a>
      <span class="text-border select-none">/</span>
      <a
        href={npmUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs tracking-wide text-muted-foreground hover:text-accent transition-colors"
      >
        npm
      </a>
      <span class="text-border select-none">/</span>
      <a
        href="/docs"
        class="text-xs tracking-wide text-muted-foreground hover:text-accent transition-colors"
      >
        Docs
      </a>
    </nav>

    <h1
      class="text-5xl sm:text-7xl tracking-tight font-normal"
      style="font-family: var(--font-display)"
    >
      <span class="text-accent">gate</span><span class="text-foreground">proof</span>
    </h1>

    <p
      class="mt-8 text-xl sm:text-2xl text-secondary-foreground"
      style="font-family: var(--font-display)"
    >
      Make agent work falsifiable.
    </p>

    <p class="mt-4 text-lg text-muted-foreground max-w-md mx-auto leading-relaxed text-balance">
      prd.ts defines intent. Gates verify reality. CI ships only with evidence.
    </p>

    <div class="mt-10 inline-flex items-center gap-3 rounded-lg border border-border bg-card p-6 w-full backdrop-blur-2xl bg-opacity-50">
      <span class="text-muted-foreground text-sm select-none">$</span>
      <code class="text-sm text-accent">bun add gateproof</code>
    </div>

    <div class="mt-8 flex items-center justify-center gap-4 w-full">
      <a
        href="/docs"
        class="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 transition-opacity w-full"
      >
        Read the docs
      </a>
      <a
        href={githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:text-foreground hover:border-foreground/20 transition-colors backdrop-blur-2xl w-full"
      >
        View on GitHub
      </a>
    </div>

    <div class="mt-16 text-left rounded-lg border border-border overflow-hidden">
      <div class="flex items-center gap-2 bg-card px-4 py-2.5 border-b border-border">
        <span class="text-xs text-muted-foreground font-mono">gate.ts</span>
      </div>
      <div class="bg-card/50 p-4">
        <CodeBlock code={exampleCode} language="typescript" />
      </div>
    </div>
  </div>
</section>
