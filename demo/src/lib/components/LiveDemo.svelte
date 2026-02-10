<script lang="ts">
  import { onMount } from 'svelte';

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

<section id="demo" class="py-20 px-4 sm:px-8">
  <div class="max-w-2xl mx-auto">
    <div class="text-center mb-10">
      <h2 class="text-3xl sm:text-4xl text-foreground">
        See it run
      </h2>
      <p class="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
        Three gates validate a live API in an isolated sandbox. Evidence streams in real time.
      </p>
    </div>

    <div class="rounded-lg border border-border overflow-hidden">
      <!-- Header -->
      <div class="bg-card px-4 py-3 flex items-center justify-between border-b border-border">
        <div class="flex items-center gap-3">
          <div class="flex gap-1.5">
            <div class="w-2.5 h-2.5 rounded-full bg-red-500/60"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-yellow-500/60"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-green-500/60"></div>
          </div>
          <span class="text-xs text-muted-foreground font-mono">live-demo.ts</span>
        </div>
        <div class="flex items-center gap-3">
          {#if running}
            <span class="text-xs text-accent font-mono animate-pulse">
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
      <div class="p-4 min-h-[280px] max-h-[380px] overflow-auto font-mono text-sm">
        {#if !hasRun}
          <div class="text-muted-foreground text-center py-12">
            <p class="mb-3">Click below to see gateproof validate a live API</p>
            <p class="text-xs opacity-70">health check / JSON response / header echo</p>
          </div>
        {:else}
          <pre class="whitespace-pre-wrap text-secondary-foreground">{output.join('')}</pre>
        {/if}

        {#if error}
          <div class="mt-4 text-red-400 text-xs">
            Error: {error}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="border-t border-border bg-card px-4 py-3 flex items-center justify-between">
        <button
          onclick={runDemo}
          disabled={running}
          class="px-5 py-2 text-sm font-medium bg-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-accent-foreground rounded-lg transition-opacity flex items-center gap-2"
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

        <span class="text-xs text-muted-foreground">Isolated Cloudflare container</span>
      </div>
    </div>
  </div>
</section>
