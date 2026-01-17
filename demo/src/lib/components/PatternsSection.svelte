<script lang="ts">
  import CodeBlock from './CodeBlock.svelte';
  
  type PatternCategory = 'basic' | 'cloudflare' | 'ci-cd' | 'advanced';
  
  let selectedCategory = $state<PatternCategory>('basic');
  
  const patterns = {
    basic: {
      title: 'Basic Patterns',
      description: 'Minimal examples showing core gateproof patterns',
      examples: [
        {
          name: 'Simple Gate',
          description: 'The simplest possible gate - minimal surface area',
          code: `import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

const provider = CloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken: process.env.CLOUDFLARE_API_TOKEN
});

const gate = {
  name: "simple-gate",
  observe: provider.observe({
    backend: "analytics",
    dataset: "worker_logs"
  }),
  act: [
    Act.browser({ url: "https://my-worker.workers.dev" })
  ],
  assert: [Assert.noErrors()],
  stop: { idleMs: 3000, maxMs: 10000 }
};

const result = await Gate.run(gate);
if (result.status !== "success") process.exit(1);`
        },
        {
          name: 'HTTP Validation',
          description: 'Validate HTTP endpoints without log observation',
          code: `import { Gate, Act, Assert } from "gateproof";

const gate = {
  name: "http-validation",
  observe: createEmptyBackend(),
  act: [
    Act.exec("curl https://api.example.com/health")
  ],
  assert: [
    Assert.custom("http_ok", (logs) => {
      // Custom validation logic
      return true;
    })
  ],
  stop: { idleMs: 1000, maxMs: 5000 }
};

await Gate.run(gate);`
        }
      ]
    },
    cloudflare: {
      title: 'Cloudflare Patterns',
      description: 'Production-ready patterns for Cloudflare Workers',
      examples: [
        {
          name: 'Analytics Engine',
          description: 'Recommended backend for production use',
          code: `const provider = CloudflareProvider({ accountId, apiToken });

const gate = {
  observe: provider.observe({
    backend: "analytics",
    dataset: "worker_logs",
    pollInterval: 1000
  }),
  act: [
    Act.exec("curl https://my-worker.workers.dev/api/test"),
    Act.wait(2000)
  ],
  assert: [
    Assert.noErrors(),
    Assert.hasAction("request_received"),
    Assert.hasStage("worker")
  ],
  stop: { idleMs: 3000, maxMs: 15000 }
};`
        },
        {
          name: 'Workers Logs API',
          description: 'Real-time log access via Workers Logs API',
          code: `const provider = CloudflareProvider({ accountId, apiToken });

const gate = {
  observe: provider.observe({
    backend: "workers-logs",
    workerName: "my-worker"
  }),
  act: [Act.browser({ url: "https://my-worker.workers.dev" })],
  assert: [Assert.noErrors(), Assert.hasAction("request_received")],
  stop: { idleMs: 3000, maxMs: 10000 }
};`
        },
        {
          name: 'CLI Stream',
          description: 'Local development with wrangler dev',
          code: `const provider = CloudflareProvider({ accountId, apiToken });

const gate = {
  observe: provider.observe({
    backend: "cli-stream",
    workerName: "my-worker"
  }),
  act: [Act.exec("curl http://localhost:8787")],
  assert: [Assert.noErrors()],
  stop: { idleMs: 2000, maxMs: 10000 }
};`
        }
      ]
    },
    'ci-cd': {
      title: 'CI/CD Patterns',
      description: 'Run gates in continuous integration pipelines',
      examples: [
        {
          name: 'GitHub Actions',
          description: 'Production smoke gate in CI',
          code: `// .github/workflows/gate.yml
- name: Run gates
  run: bun run gates/production/smoke.gate.ts
  env:
    CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CF_ACCOUNT_ID }}
    CLOUDFLARE_API_TOKEN: \${{ secrets.CF_API_TOKEN }}

// gates/production/smoke.gate.ts
const gate = {
  name: "ci-production-smoke",
  observe: provider.observe({ backend: "analytics" }),
  act: [
    Act.browser({ url: process.env.PRODUCTION_URL, headless: true }),
    Act.wait(2000)
  ],
  assert: [
    Assert.noErrors(),
    Assert.hasAction("request_received")
  ],
  stop: { idleMs: 3000, maxMs: 15000 }
};

const result = await Gate.run(gate);
if (result.status !== "success") process.exit(1);`
        }
      ]
    },
    advanced: {
      title: 'Advanced Patterns',
      description: 'Custom backends and advanced use cases',
      examples: [
        {
          name: 'Custom Backend',
          description: 'Plug in any observability system',
          code: `import { createObserveResource, type Backend } from "gateproof";
import { Effect } from "effect";

function createApiBackend(apiUrl: string): Backend {
  return {
    start: () => Effect.gen(function* () {
      return {
        async *[Symbol.asyncIterator]() {
          // Poll API and yield logs
          const logs = await fetch(apiUrl).then(r => r.json());
          for (const log of logs) yield log;
        }
      };
    }),
    stop: () => Effect.void
  };
}

const gate = {
  observe: createObserveResource(createApiBackend("https://api.example.com/logs")),
  act: [Act.exec("curl https://api.example.com/trigger")],
  assert: [Assert.noErrors()],
  stop: { idleMs: 2000, maxMs: 10000 }
};`
        },
        {
          name: 'Multiple Gates',
          description: 'Run gates in sequence for comprehensive validation',
          code: `const gates = [
  { name: "smoke", /* ... */ },
  { name: "api", /* ... */ },
  { name: "e2e", /* ... */ }
];

for (const gate of gates) {
  const result = await Gate.run(gate);
  if (result.status !== "success") {
    console.error(\`Gate \${gate.name} failed\`);
    process.exit(1);
  }
}

console.log("All gates passed");`
        }
      ]
    }
  };
</script>

<section class="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-amber-50 to-white py-20">
  <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
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
    <div class="flex flex-wrap justify-center gap-3 mb-8">
      {#each Object.keys(patterns) as category}
        <button
          onclick={() => selectedCategory = category as PatternCategory}
          class="px-6 py-3 rounded-lg font-medium transition-all {selectedCategory === category 
            ? 'bg-amber-500 text-white shadow-lg' 
            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}"
        >
          {patterns[category as PatternCategory].title}
        </button>
      {/each}
    </div>
    
    <!-- Pattern Examples -->
    <div class="space-y-6">
      {#each patterns[selectedCategory].examples as example}
        <div class="bg-white rounded-lg shadow-lg border border-amber-200 overflow-hidden">
          <div class="p-6 border-b border-amber-200 bg-amber-50">
            <h3 class="text-2xl font-bold text-amber-900 mb-2">{example.name}</h3>
            <p class="text-amber-700">{example.description}</p>
          </div>
          <div class="bg-gray-900 p-4 overflow-x-auto">
            <CodeBlock code={example.code} language="typescript" />
          </div>
        </div>
      {/each}
    </div>
    
    <!-- Footer CTA -->
    <div class="text-center mt-12">
      <a
        href="https://github.com/gateproof/gateproof/tree/main/patterns"
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
