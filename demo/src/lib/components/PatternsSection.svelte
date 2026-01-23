<script lang="ts">
  import CodeBlock from './CodeBlock.svelte';
  
  type PatternId = 'e2e' | 'prd' | 'cloudflare' | 'ci-cd' | 'advanced';

  type Pattern = {
    id: PatternId;
    tab: string;
    title: string;
    description: string;
    language?: string;
    code: string;
  };

  const patterns: readonly Pattern[] = [
    {
      id: 'e2e',
      tab: 'E2E (Story → Gate)',
      title: 'One file: define a Story, run its Gate',
      description: 'Minimal end-to-end: story metadata + gate execution in one file.',
      language: 'typescript',
      code: `// patterns/e2e.story-and-gate.ts
import { Gate, Act, Assert, type Story } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

// 1) The Story (your PRD can be a list of these)
const story: Story = {
  id: "user-signup",
  title: "User can sign up",
  gateFile: "./gates/user-signup.gate.ts"
};

// 2) The Gate (executable proof for that story)
const provider = CloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken: process.env.CLOUDFLARE_API_TOKEN!
});

const result = await Gate.run({
  name: story.id,
  observe: provider.observe({ backend: "analytics", dataset: "worker_logs" }),
  act: [Act.browser({ url: "https://app.example.com/signup" })],
  assert: [Assert.noErrors(), Assert.hasAction("user_created")],
  stop: { idleMs: 3000, maxMs: 15000 }
});

if (result.status !== "success") process.exit(1);`
    },
    {
      id: 'prd',
      tab: 'PRD.ts',
      title: 'PRD.ts: stories + dependencies',
      description: 'A PRD is just typed data. Stories can depend on other stories.',
      language: 'typescript',
      code: `// patterns/prd/prd.ts
import type { Story } from "gateproof";

export const prd = {
  stories: [
    {
      id: "user-signup",
      title: "User can sign up",
      gateFile: "./gates/user-signup.gate.ts"
    },
    {
      id: "email-verification",
      title: "Email verification works",
      gateFile: "./gates/email-verification.gate.ts",
      dependsOn: ["user-signup"]
    }
  ]
} satisfies { stories: readonly Story[] };`
    },
    {
      id: 'cloudflare',
      tab: 'Cloudflare Backends',
      title: 'Cloudflare: choose an observe backend',
      description: 'Same gate API; swap the observe backend based on environment.',
      language: 'typescript',
      code: `// patterns/cloudflare/choose-backend.ts
import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

const provider = CloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken: process.env.CLOUDFLARE_API_TOKEN!
});

const observe = provider.observe({
  backend: "analytics",
  dataset: "worker_logs",
  pollInterval: 1000
});

await Gate.run({
  name: "post-deploy-check",
  observe,
  act: [Act.exec("curl https://my-worker.workers.dev")],
  assert: [Assert.noErrors(), Assert.hasAction("request_received")],
  stop: { idleMs: 3000, maxMs: 15000 }
});`
    },
    {
      id: 'ci-cd',
      tab: 'CI/CD Integration',
      title: 'CI: fail the deploy if the gate fails',
      description: 'Run a production gate right after deploy; non-zero exits block the workflow.',
      language: 'yaml',
      code: `# .github/workflows/deploy.yml
- name: Deploy
  run: wrangler deploy

- name: Validate deploy (gateproof)
  run: bun run gates/production/smoke.gate.ts
  env:
    CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CF_ACCOUNT_ID }}
    CLOUDFLARE_API_TOKEN: \${{ secrets.CF_API_TOKEN }}
    PRODUCTION_URL: \${{ secrets.PRODUCTION_URL }}`
    },
    {
      id: 'advanced',
      tab: 'Advanced Use Cases',
      title: 'Custom backend: bring your own observability',
      description: 'Implement `Backend` once; keep the Gate/Act/Assert contract.',
      language: 'typescript',
      code: `// patterns/advanced/custom-backend.ts
import { createObserveResource, type Backend } from "gateproof";
import { Effect } from "effect";

function createBackend(): Backend {
  return {
    start: () =>
      Effect.gen(function* () {
        return {
          async *[Symbol.asyncIterator]() {
            const response = await fetch("https://example.com/logs");
            const logs = await response.json();
            for (const log of logs) yield log;
          }
        };
      }),
    stop: () => Effect.void
  };
}

export const observe = createObserveResource(createBackend());`
    }
  ];

  let selected = $state<PatternId>('e2e');
  let current = $derived.by(() => patterns.find((p) => p.id === selected)!);
</script>

<section class="relative min-h-screen flex items-center justify-center overflow-hidden bg-linear-to-b from-amber-50 to-white py-20 text-balance">
  <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-8">
    <!-- Header -->
    <div class="text-center mb-12">
      <h2 class="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 text-amber-900">
        Patterns & Examples
      </h2>
      <p class="text-xl sm:text-2xl max-w-3xl mx-auto text-amber-800">
        Real-world examples for every use case. Copy, adapt, deploy.
      </p>
    </div>
    
    <!-- Category Tabs -->
    <div class="flex flex-wrap justify-center gap-3 mb-8 px-6">
      {#each patterns as pattern (pattern.id)}
        <button
          onclick={() => selected = pattern.id}
          class="px-6 py-3 rounded-lg font-medium transition-all {selected === pattern.id
            ? 'bg-amber-500 text-white shadow-lg' 
            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}"
        >
          {pattern.tab}
        </button>
      {/each}
    </div>

    <!-- Pattern -->
    <div class="max-w-2xl mx-auto">
      <div class="bg-white rounded-lg shadow-lg border border-amber-200 overflow-hidden">
        <div class="p-6 border-b border-amber-200 bg-amber-50">
          <h3 class="text-2xl font-bold text-amber-900 mb-2">{current.title}</h3>
          <p class="text-amber-700">{current.description}</p>
        </div>
        <div class="bg-gray-900 p-4 overflow-hidden min-w-0">
          {#key selected}
            <CodeBlock code={current.code} language={current.language ?? "typescript"} wrap />
          {/key}
        </div>
      </div>
    </div>
    
    <!-- Footer CTA -->
    <div class="text-center mt-12">
      <a
        href="https://github.com/acoyfellow/gateproof/tree/main/patterns"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
          <path d="M9 18c-4.51 2-5-2-7-2"/>
        </svg>
        <span>View all patterns on GitHub</span>
      </a>
    </div>
  </div>
</section>
