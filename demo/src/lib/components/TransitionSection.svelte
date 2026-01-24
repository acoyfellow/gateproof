<script lang="ts">
  import CodeBlock from './CodeBlock.svelte';
  
  let openFaq: number | null = null;
  
  const faqs = [
    {
      q: "Isn't this just E2E testing with extra steps?",
      a: "Similar goal, different anchor. Traditional E2E tests assert against DOM/API responses. Gates assert against observability (logs, telemetry, traces). The contract is: observe → act → assert → evidence. If your backend doesn't log what you need, the gate fails. That's the point — it makes observability a dependency, not an afterthought."
    },
    {
      q: "What happens when my observability backend is flaky or drops logs?",
      a: "The gate fails. Gates don't fix missing telemetry — they make the dependency explicit. If your backend drops logs, a gate can be wrong. But you'll know immediately, not in production. This is a feature: gates force you to fix observability before you ship broken code."
    },
    {
      q: "Why would I use this instead of Playwright + assertions?",
      a: "Use both. Playwright checks the UI. Gates check the system. A gate can verify that a signup action logged 'user_created' in your analytics, that no errors hit your error tracking, that the request ID propagated through your stack. Playwright can't see that. Gates can't see DOM state. They're complementary."
    },
    {
      q: "This seems like overhead. How is this better than just writing tests?",
      a: "It can be overhead. The pitch isn't 'gate everything.' It's 'gate the few transitions that are expensive to get wrong.' Start with one critical path. If it reduces uncertainty, keep it. If it doesn't fit, delete it. Gates are just TypeScript files — no vendor lock-in."
    },
    {
      q: "What if my logs don't capture what I need to verify?",
      a: "Then you can't gate it. Gates are bounded by what you can observe. This is intentional: it forces you to instrument what matters. If you can't observe it, you can't verify it. That's a system design problem, not a gateproof problem."
    },
    {
      q: "How is this different from contract testing or integration tests?",
      a: "Contract tests verify API contracts. Integration tests verify component interactions. Gates verify system behavior through observability. They're not mutually exclusive. Gates are evidence-first: they check what actually happened (logs), not just what should happen (contracts)."
    },
    {
      q: "What's the actual ROI here? When does this pay off?",
      a: "It pays off when: (1) You're shipping features that depend on distributed systems, (2) You need to verify behavior that's hard to test in isolation, (3) You want agents to iterate with minimal context. If you're building a simple CRUD app, this is probably overkill. If you're building systems where observability matters, gates make that dependency explicit and enforceable."
    }
  ];
  
  function toggleFaq(index: number) {
    openFaq = openFaq === index ? null : index;
  }
  
  const codeSnippet = `// prd.ts
import { definePrd, runPrd } from "gateproof/prd";

export const prd = definePrd({
  stories: [
    {
      id: "api-health-check",
      title: "API responds without errors",
      gateFile: "./gates/api-health-check.gate.ts"
    }
  ]
});

if (import.meta.main) {
  const result = await runPrd(prd);
  process.exit(result.success ? 0 : 1);
}

// gates/api-health-check.gate.ts
import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

export async function run() {
  const provider = CloudflareProvider({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN
  });

  const result = await Gate.run({
    name: "api-health-check",
    observe: provider.observe({
      backend: "analytics",
      dataset: "worker_logs"
    }),
    act: [Act.browser({ url: "https://my-worker.workers.dev" })],
    assert: [
      Assert.noErrors(),
      Assert.hasAction("request_received")
    ]
  });

  return { status: result.status };
}`;
</script>

<section class="relative flex items-center justify-center py-40">
  <!-- Full bleed background image -->
  <div 
    class="absolute inset-0 bg-cover bg-center bg-no-repeat"
    style="background-image: url('/transition.jpg');"
  >
    <!-- Gradient overlay for text readability - darker on left, lighter on right -->
    <div 
      class="absolute inset-0"
      style="background: linear-gradient(90deg, 
        rgba(0, 0, 0, 0.7) 0%, 
        rgba(0, 0, 0, 0.5) 30%,
        rgba(0, 0, 0, 0.3) 50%,
        rgba(255, 255, 255, 0.2) 70%,
        rgba(255, 255, 255, 0.1) 100%
      );"
    ></div>

    <div class="absolute inset-0 bg-linear-to-b from-black via-black/30 to-transparent"></div>
  </div>
  
  <!-- Content -->
  <div class="relative z-10 flex flex-col items-center gap-12 px-4 sm:px-8 max-w-5xl mx-auto">
    <h2 class="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-tight text-center">
      <span class="text-white">From Chaos</span><br/>
      <span class="text-amber-300">to Order</span>
    </h2>
    
    <p class="text-center text-xl sm:text-2xl md:text-3xl font-medium max-w-3xl leading-relaxed text-white drop-shadow-lg">
      Observe → fail → fix → accept<br/>
      <span class="text-amber-300">reality decides</span>
    </p>
    
    <!-- Code Example -->
    <div class="my-8 bg-black/60 backdrop-blur-sm border border-amber-300/30 rounded-lg shadow-xl max-w-4xl w-full min-w-0">
      <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto min-w-0">
        <CodeBlock code={codeSnippet} language="typescript" />
      </div>
    </div>
    
    <!-- FAQ Section -->
    <div class="mt-16 w-full max-w-4xl">
      <h3 class="text-3xl sm:text-4xl font-bold text-center mb-8 text-white">
        <span class="text-amber-300">Honest</span> answers
      </h3>
      
      <div class="space-y-4">
        {#each faqs as faq, i}
          <div class="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden">
            <button
              onclick={() => toggleFaq(i)}
              class="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-white/5 transition-colors"
            >
              <span class="text-lg font-semibold text-white pr-4">{faq.q}</span>
              <svg
                class="w-5 h-5 text-amber-300 shrink-0 transition-transform {openFaq === i ? 'rotate-180' : ''}"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {#if openFaq === i}
              <div class="px-6 pb-4 pt-2 border-t border-white/10">
                <p class="text-white/80 leading-relaxed text-balance whitespace-pre-wrap break-words">{faq.a}</p>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>
