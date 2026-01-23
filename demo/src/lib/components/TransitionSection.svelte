<script lang="ts">
  import CodeBlock from './CodeBlock.svelte';
  
  const codeSnippet = `// prd.ts
export const stories = [
  {
    id: "api-health-check",
    title: "API responds without errors",
    gateFile: "./gates/api-health-check.gate.ts",
    status: "pending"
  }
];

// gates/api-health-check.gate.ts
import { Gate, Act, Assert } from "gateproof";
import { CloudflareProvider } from "gateproof/cloudflare";

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

if (result.status !== "success") process.exit(1);`;
</script>

<section class="relative flex items-center justify-center overflow-hidden py-12 sm:py-20">
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
  </div>
</section>
