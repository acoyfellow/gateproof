<script lang="ts">
  import CodeBlock from './CodeBlock.svelte';
  
  type PatternCategory = 'basic' | 'cloudflare' | 'ci-cd' | 'advanced';
  
  let selectedCategory = $state<PatternCategory>('basic');
  
  const patterns = {
    basic: {
      title: 'Common Use Cases',
      description: 'Real scenarios where gateproof saves time',
      examples: [
        {
          name: 'Did My Deploy Work?',
          description: 'After deploying, validate it actually works by checking real logs',
          code: `import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

// After deploying, did it actually work?
const provider = CloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken: process.env.CLOUDFLARE_API_TOKEN
});

const gate = {
  name: "post-deploy-check",
  observe: provider.observe({
    backend: "analytics",
    dataset: "worker_logs"
  }),
  act: [
    Act.browser({ url: "https://my-worker.workers.dev" })
  ],
  assert: [
    Assert.noErrors(),  // No errors in logs
    Assert.hasAction("request_received")  // Request was actually processed
  ],
  stop: { idleMs: 3000, maxMs: 10000 }
};

const result = await Gate.run(gate);
if (result.status !== "success") {
  console.error("Deploy validation failed!");
  process.exit(1);
}`,
        },
        {
          name: 'Is My API Actually Healthy?',
          description: 'Check real error rates from production logs, not just HTTP status codes',
          code: `import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

// HTTP 200 doesn't mean no errors in logs
const provider = CloudflareProvider({ accountId, apiToken });

const gate = {
  name: "api-health-check",
  observe: provider.observe({
    backend: "analytics",
    dataset: "worker_logs"
  }),
  act: [
    Act.exec("curl https://api.example.com/users"),
    Act.exec("curl https://api.example.com/posts"),
    Act.wait(2000)  // Wait for logs to propagate
  ],
  assert: [
    Assert.noErrors(),  // Real errors from logs, not just HTTP codes
    Assert.hasAction("request_received"),
    Assert.custom("acceptable_latency", (logs) => {
      const latencies = logs
        .filter(l => l.stage === "worker")
        .map(l => l.durationMs || 0);
      return latencies.every(ms => ms < 500);
    })
  ],
  stop: { idleMs: 3000, maxMs: 15000 }
};

await Gate.run(gate);`
        },
        {
          name: 'Did I Break Something?',
          description: 'Before merging, verify your changes don\'t break production workflows',
          code: `import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

// Run this before merging to main
const provider = CloudflareProvider({ accountId, apiToken });

const gate = {
  name: "pre-merge-validation",
  observe: provider.observe({
    backend: "analytics",
    dataset: "worker_logs"
  }),
  act: [
    Act.browser({ url: "https://staging.example.com/checkout" }),
    Act.browser({ url: "https://staging.example.com/api/orders" })
  ],
  assert: [
    Assert.noErrors(),
    Assert.hasAction("checkout_complete"),
    Assert.hasAction("order_created")
  ],
  stop: { idleMs: 5000, maxMs: 20000 }
};

const result = await Gate.run(gate);
if (result.status !== "success") {
  console.error("❌ Pre-merge check failed - don't merge!");
  process.exit(1);
}
console.log("✅ All checks passed - safe to merge");`
        }
      ]
    },
    cloudflare: {
      title: 'Cloudflare Backends',
      description: 'Choose the right backend for your environment',
      examples: [
        {
          name: 'Production: Analytics Engine',
          description: 'Recommended for production - reliable, scalable, cost-effective',
          code: `import { CloudflareProvider } from "gateproof/cloudflare";

const provider = CloudflareProvider({ accountId, apiToken });

// Best for production - handles scale, low cost
const gate = {
  observe: provider.observe({
    backend: "analytics",
    dataset: "worker_logs",
    pollInterval: 1000  // Poll every second
  }),
  act: [
    Act.exec("curl https://my-worker.workers.dev/api/test"),
    Act.wait(2000)  // Wait for logs to propagate
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
          name: 'Real-time: Workers Logs API',
          description: 'Instant log access - perfect for debugging and development',
          code: `import { CloudflareProvider } from "gateproof/cloudflare";

const provider = CloudflareProvider({ accountId, apiToken });

// Real-time logs - great for debugging
const gate = {
  observe: provider.observe({
    backend: "workers-logs",
    workerName: "my-worker"
  }),
  act: [Act.browser({ url: "https://my-worker.workers.dev" })],
  assert: [
    Assert.noErrors(),
    Assert.hasAction("request_received")
  ],
  stop: { idleMs: 3000, maxMs: 10000 }
};`
        },
        {
          name: 'Local Dev: CLI Stream',
          description: 'Test locally with wrangler dev - see logs as they happen',
          code: `import { CloudflareProvider } from "gateproof/cloudflare";

const provider = CloudflareProvider({ accountId, apiToken });

// Local development - stream logs from wrangler dev
const gate = {
  observe: provider.observe({
    backend: "cli-stream",
    workerName: "my-worker"
  }),
  act: [Act.exec("curl http://localhost:8787")],
  assert: [Assert.noErrors()],
  stop: { idleMs: 2000, maxMs: 10000 }
};

// Run: wrangler dev & bun run gates/local/my-gate.gate.ts`
        }
      ]
    },
    'ci-cd': {
      title: 'CI/CD Integration',
      description: 'Block bad deploys automatically - catch errors before users do',
      examples: [
        {
          name: 'GitHub Actions: Block Bad Deploys',
          description: 'Automatically validate production after deploy - fail CI if broken',
          code: `# .github/workflows/deploy.yml
- name: Deploy to production
  run: wrangler deploy

- name: Validate deployment
  run: bun run gates/production/smoke.gate.ts
  env:
    CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CF_ACCOUNT_ID }}
    CLOUDFLARE_API_TOKEN: \${{ secrets.CF_API_TOKEN }}
  # If this fails, the workflow fails - deploy is blocked

# gates/production/smoke.gate.ts
const gate = {
  name: "post-deploy-validation",
  observe: provider.observe({ backend: "analytics" }),
  act: [
    Act.browser({ url: process.env.PRODUCTION_URL, headless: true }),
    Act.wait(2000)  // Wait for logs
  ],
  assert: [
    Assert.noErrors(),  // No errors in production logs
    Assert.hasAction("request_received")  // Actually processed requests
  ],
  stop: { idleMs: 3000, maxMs: 15000 }
};

const result = await Gate.run(gate);
if (result.status !== "success") {
  console.error("❌ Production validation failed!");
  process.exit(1);  // Fails CI - prevents bad deploy
}`,
        }
      ]
    },
    advanced: {
      title: 'Advanced Use Cases',
      description: 'Extend gateproof to work with any observability system',
      examples: [
        {
          name: 'Custom Backend: Any Observability System',
          description: 'Plug in Datadog, New Relic, or any log system - gateproof works with anything',
          code: `import { createObserveResource, type Backend } from "gateproof";
import { Effect } from "effect";

// Works with any observability backend
function createDatadogBackend(apiKey: string): Backend {
  return {
    start: () => Effect.gen(function* () {
      return {
        async *[Symbol.asyncIterator]() {
          // Poll your observability API
          const response = await fetch(
            \`https://api.datadoghq.com/api/v1/logs\`,
            { headers: { "DD-API-KEY": apiKey } }
          );
          const logs = await response.json();
          for (const log of logs) yield log;
        }
      };
    }),
    stop: () => Effect.void
  };
}

const gate = {
  observe: createObserveResource(createDatadogBackend(process.env.DATADOG_API_KEY)),
  act: [Act.exec("curl https://api.example.com/trigger")],
  assert: [Assert.noErrors()],
  stop: { idleMs: 2000, maxMs: 10000 }
};

// Same API, works with any backend`
        },
        {
          name: 'Multi-Step Validation',
          description: 'Validate complex workflows end-to-end - ensure each step completes',
          code: `// Validate a complete user journey
const gates = [
  {
    name: "user-signup",
    observe: provider.observe({ backend: "analytics" }),
    act: [Act.browser({ url: "https://app.example.com/signup" })],
    assert: [
      Assert.hasAction("user_created"),
      Assert.noErrors()
    ],
    stop: { idleMs: 3000, maxMs: 10000 }
  },
  {
    name: "email-sent",
    observe: provider.observe({ backend: "analytics" }),
    act: [Act.wait(5000)],  // Wait for email
    assert: [
      Assert.hasAction("email_sent"),
      Assert.hasAction("verification_email_queued")
    ],
    stop: { idleMs: 5000, maxMs: 15000 }
  },
  {
    name: "onboarding-complete",
    observe: provider.observe({ backend: "analytics" }),
    act: [Act.browser({ url: "https://app.example.com/onboarding" })],
    assert: [
      Assert.hasAction("onboarding_started"),
      Assert.hasAction("onboarding_completed")
    ],
    stop: { idleMs: 3000, maxMs: 20000 }
  }
];

// Run all gates - fail if any step breaks
for (const gate of gates) {
  const result = await Gate.run(gate);
  if (result.status !== "success") {
    console.error(\`❌ \${gate.name} failed - workflow broken\`);
    process.exit(1);
  }
}
console.log("✅ Complete workflow validated");`
        }
      ]
    }
  };
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
    <div class="space-y-20">
      {#each patterns[selectedCategory].examples as example}
        <div class="bg-white rounded-lg shadow-lg border border-amber-200 overflow-hidden">
          <div class="p-6 border-b border-amber-200 bg-amber-50">
            <h3 class="text-2xl font-bold text-amber-900 mb-2">{example.name}</h3>
            <p class="text-amber-700">{example.description}</p>
          </div>
          <div class="bg-gray-900 p-4 overflow-x-auto min-w-0">
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
