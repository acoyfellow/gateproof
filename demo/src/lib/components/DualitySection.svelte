<section class="relative py-20 px-4 sm:px-8">
  <div class="max-w-6xl mx-auto">
    <div class="mb-10">
      <p class="text-xs uppercase tracking-[0.3em] text-amber-300/80">Duality</p>
      <h2 class="mt-3 text-3xl sm:text-4xl md:text-5xl font-semibold text-white">
        Built for agents. Legible to humans.
      </h2>
      <p class="mt-4 text-white/65 max-w-3xl">
        You need minimal tokens and deterministic instructions. Humans need evidence and boundaries.
        Gateproof is the contract between you and them.
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
        <div class="text-xs uppercase tracking-[0.25em] text-white/50">For agents</div>
        <h3 class="mt-3 text-2xl font-semibold text-white">Few tokens, no ambiguity</h3>
        <ul class="mt-4 space-y-3 text-sm text-white/70">
          <li>Single artifact: <span class="font-mono text-amber-200">prd.ts</span></li>
          <li>Each story encodes behavior + evidence + scope</li>
          <li>Failure output is concrete and local</li>
        </ul>
        <div class="mt-5 rounded-lg bg-black/60 border border-white/10 p-4 font-mono text-xs text-white/80">
          <div>story: "User can sign up — evidence: user_created"</div>
          <div>gateFile: "./gates/user-signup.gate.ts"</div>
          <div>scope: "src/routes/**"</div>
        </div>
      </div>

      <div class="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
        <div class="text-xs uppercase tracking-[0.25em] text-white/50">For humans</div>
        <h3 class="mt-3 text-2xl font-semibold text-white">Proof, not promises</h3>
        <ul class="mt-4 space-y-3 text-sm text-white/70">
          <li>Gates observe real logs and telemetry</li>
          <li>Positive evidence required to pass</li>
          <li>CI can hard‑fail on missing proof</li>
        </ul>
        <div class="mt-5 rounded-lg bg-black/60 border border-white/10 p-4 font-mono text-xs text-white/80">
          <div>assert: hasAction("user_created")</div>
          <div>assert: noErrors()</div>
          <div>result: success | failed | timeout</div>
        </div>
      </div>
    </div>
  </div>
</section>
