<script lang="ts">
  import { reveal } from "$lib/reveal";

  interface TerminalLine {
    text: string;
    tone: "cmd" | "pass" | "muted";
  }

  const lines: ReadonlyArray<TerminalLine> = [
    { text: "$ bun run example:hello-theorem", tone: "cmd" },
    { text: "honest-kernel   Claim.lean        lean accepts       pass", tone: "pass" },
    { text: "sorry-is-red    cheat-sorry.lean  check rejects      pass", tone: "pass" },
    { text: "axiom-is-red    cheat-axiom.lean  check rejects      pass", tone: "pass" },
    { text: "status: pass · 3 stories · cheats stay red", tone: "muted" },
  ];

  function toneClass(tone: TerminalLine["tone"]): string {
    if (tone === "pass") return "text-emerald-400";
    if (tone === "cmd") return "text-foreground";
    return "text-muted-foreground";
  }
</script>

<div use:reveal class="overflow-hidden rounded-[2rem] border border-border/80 bg-card/75 shadow-2xl shadow-black/30 backdrop-blur-sm">
  <div class="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
    <div class="border-b border-border/70 p-6 lg:border-b-0 lg:border-r">
      <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">lean gate</p>
      <h2 class="mt-3 text-2xl leading-tight text-foreground sm:text-4xl">The kernel judges. The agent cannot fake it.</h2>
      <p class="mt-3 text-sm leading-7 text-secondary-foreground">
        One story runs <code class="text-foreground">lean</code> on an honest proof. Two stories depend on it and pass only when the
        <code class="text-foreground">sorry</code> and <code class="text-foreground">axiom</code> cheats are rejected.
      </p>
      <a href="/docs/how-to/gate-a-lean-proof" class="mt-5 inline-block text-sm text-accent hover:opacity-80">Gate a Lean proof →</a>
    </div>
    <div class="bg-[#0c0a09] p-5 font-mono text-xs leading-7 sm:p-6" role="img" aria-label="Illustrative output of bun run example:hello-theorem: three stories pass">
      <div class="mb-3 flex gap-1.5" aria-hidden="true">
        <span class="h-2.5 w-2.5 rounded-full bg-red-500/60"></span>
        <span class="h-2.5 w-2.5 rounded-full bg-amber-400/60"></span>
        <span class="h-2.5 w-2.5 rounded-full bg-emerald-500/60"></span>
      </div>
      {#each lines as line, index}
        <p class="gp-line-in whitespace-pre {toneClass(line.tone)}" style="--gp-i: {index}">{line.text}</p>
      {/each}
      <p class="gp-caret text-muted-foreground">$</p>
    </div>
  </div>
</div>
