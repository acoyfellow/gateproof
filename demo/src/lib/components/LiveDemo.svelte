<script lang="ts">
  import { onMount } from 'svelte';

  // Pre-baked demo that shows clear value
  const demoCode = `// Live API Validation Demo
import { Gate, Act, Assert, createHttpObserveResource } from "gateproof";

const API_URL = process.env.API_URL || "https://httpbin.org";

// Gate 1: API responds with 200
console.log("\\n🚪 Gate 1: API Health Check");
console.log("   Checking: " + API_URL + "/status/200");

const healthGate = {
  name: "api-health",
  observe: createHttpObserveResource({
    url: API_URL + "/status/200",
    pollInterval: 500
  }),
  act: [Act.wait(300)],
  assert: [
    Assert.custom("returns_200", (logs) => {
      const http = logs.find(l => l.stage === "http");
      return http?.status === "success";
    })
  ],
  stop: { idleMs: 500, maxMs: 5000 }
};

const health = await Gate.run(healthGate);
console.log("   " + (health.status === "success" ? "✅ PASSED" : "❌ FAILED") + " - API is healthy");

// Gate 2: API returns JSON
console.log("\\n🚪 Gate 2: JSON Response");
console.log("   Checking: " + API_URL + "/json");

const jsonGate = {
  name: "json-response",
  observe: createHttpObserveResource({
    url: API_URL + "/json",
    pollInterval: 500
  }),
  act: [Act.wait(300)],
  assert: [
    Assert.custom("has_slideshow", (logs) => {
      const http = logs.find(l => l.stage === "http");
      const body = http?.data?.body;
      return typeof body === "object" && body !== null && "slideshow" in body;
    })
  ],
  stop: { idleMs: 500, maxMs: 5000 }
};

const json = await Gate.run(jsonGate);
console.log("   " + (json.status === "success" ? "✅ PASSED" : "❌ FAILED") + " - Returns valid JSON");

// Gate 3: API echoes headers
console.log("\\n🚪 Gate 3: Header Echo");
console.log("   Checking: " + API_URL + "/headers");

const headerGate = {
  name: "header-echo",
  observe: createHttpObserveResource({
    url: API_URL + "/headers",
    headers: { "X-Test-Header": "gateproof-demo" },
    pollInterval: 500
  }),
  act: [Act.wait(300)],
  assert: [
    Assert.custom("echoes_header", (logs) => {
      const http = logs.find(l => l.stage === "http");
      const body = http?.data?.body;
      return body?.headers?.["X-Test-Header"] === "gateproof-demo";
    })
  ],
  stop: { idleMs: 500, maxMs: 5000 }
};

const headers = await Gate.run(headerGate);
console.log("   " + (headers.status === "success" ? "✅ PASSED" : "❌ FAILED") + " - Echoes custom headers");

// Summary
console.log("\\n" + "─".repeat(40));
const passed = [health, json, headers].filter(r => r.status === "success").length;
const total = 3;
console.log("📊 Results: " + passed + "/" + total + " gates passed");
console.log("⏱️  Total time: " + (health.durationMs + json.durationMs + headers.durationMs) + "ms");

if (passed === total) {
  console.log("\\n✨ All gates passed! API is behaving correctly.");
} else {
  console.log("\\n⚠️  Some gates failed. Check API behavior.");
}

process.exit(passed === total ? 0 : 1);
`;

  let running = $state(false);
  let output = $state<string[]>([]);
  let error = $state<string | null>(null);
  let elapsedMs = $state(0);
  let timer: ReturnType<typeof setInterval> | null = null;
  let startTime = $state<number | null>(null);
  let hasRun = $state(false);

  async function runDemo() {
    running = true;
    hasRun = true;
    error = null;
    output = ["Starting sandbox...\n"];
    startTime = Date.now();
    elapsedMs = 0;

    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (startTime) elapsedMs = Date.now() - startTime;
    }, 100);

    try {
      const response = await fetch('/api/prd/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prdFile: demoCode,
          apiUrl: 'https://httpbin.org'
        })
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start demo');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let chunkEnd = buffer.indexOf('\n\n');
        while (chunkEnd !== -1) {
          const chunk = buffer.slice(0, chunkEnd).trim();
          buffer = buffer.slice(chunkEnd + 2);
          chunkEnd = buffer.indexOf('\n\n');

          if (!chunk) continue;
          const lines = chunk.split('\n');
          let eventType = 'message';
          let dataPayload = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.replace('event:', '').trim();
            } else if (line.startsWith('data:')) {
              dataPayload += line.replace('data:', '').trim();
            }
          }

          if (!dataPayload) continue;

          try {
            const data = JSON.parse(dataPayload);
            if (eventType === 'stdout' && data.data) {
              // Filter out noisy output, keep the good stuff
              const text = data.data;
              const isNoise =
                text.includes('Process completed with exit code') ||
                text.startsWith('timestamp=') ||
                text.startsWith('{') ||
                text.startsWith('}') ||
                text.startsWith('  "') ||
                text.startsWith('    "') ||
                text.startsWith('      "') ||
                text.startsWith('  ]') ||
                text.startsWith('  }') ||
                text.trim() === '[' ||
                text.trim() === ']';
              if (!isNoise) {
                output = [...output, text];
              }
            } else if (eventType === 'complete') {
              output = [...output, "\n🏁 Demo complete!\n"];
            } else if (eventType === 'error') {
              error = data.error;
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      running = false;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
  }

  function formatTime(ms: number): string {
    return (ms / 1000).toFixed(1) + 's';
  }
</script>

<section id="demo" class="relative py-16 px-4 sm:px-8">
  <div class="max-w-4xl mx-auto">
    <div class="text-center mb-8">
      <h2 class="text-3xl sm:text-4xl font-semibold text-white mb-3">
        Runtime proof stream
      </h2>
      <p class="text-white/70 text-sm max-w-xl mx-auto">
        Three gates run against a live API (httpbin.org) in an isolated sandbox.
        Evidence is emitted in real time.
      </p>
    </div>

    <div class="bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden">
      <!-- Header -->
      <div class="bg-gray-900/80 px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="flex gap-1.5">
            <div class="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div class="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div class="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          <span class="text-xs text-white/50 font-mono">live-demo.ts</span>
        </div>
        <div class="flex items-center gap-3">
          {#if running}
            <span class="text-xs text-amber-300 font-mono animate-pulse">
              Running... {formatTime(elapsedMs)}
            </span>
          {:else if hasRun && !error}
            <span class="text-xs text-green-400 font-mono">
              Completed in {formatTime(elapsedMs)}
            </span>
          {/if}
        </div>
      </div>

      <!-- Output -->
      <div class="p-4 min-h-[300px] max-h-[400px] overflow-auto font-mono text-sm">
        {#if !hasRun}
          <div class="text-white/40 text-center py-8">
            <p class="mb-4">Click "Run Demo" to see gateproof validate a live API</p>
            <p class="text-xs">Gates will test: health check, JSON response, header echo</p>
          </div>
        {:else}
          <pre class="whitespace-pre-wrap text-white/90">{output.join('')}</pre>
        {/if}

        {#if error}
          <div class="mt-4 text-red-400 text-xs">
            Error: {error}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="border-t border-white/10 bg-black/50 px-4 py-3 flex items-center justify-between">
        <button
          onclick={runDemo}
          disabled={running}
          class="px-6 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
        >
          {#if running}
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            Running...
          {:else}
            Run Demo
          {/if}
        </button>

        <span class="text-xs text-white/50">Runs in an isolated Cloudflare container</span>
      </div>
    </div>

    <!-- What's happening -->
    <div class="mt-6 grid grid-cols-3 gap-4 text-center">
      <div class="bg-black/30 rounded-lg p-4 border border-white/5">
        <div class="text-[11px] uppercase tracking-[0.2em] text-white/50">Observe</div>
        <div class="mt-2 text-xs text-white/70">HTTP signals collected</div>
      </div>
      <div class="bg-black/30 rounded-lg p-4 border border-white/5">
        <div class="text-[11px] uppercase tracking-[0.2em] text-white/50">Assert</div>
        <div class="mt-2 text-xs text-white/70">Evidence required to pass</div>
      </div>
      <div class="bg-black/30 rounded-lg p-4 border border-white/5">
        <div class="text-[11px] uppercase tracking-[0.2em] text-white/50">Record</div>
        <div class="mt-2 text-xs text-white/70">Pass/fail stored for CI</div>
      </div>
    </div>
  </div>
</section>
