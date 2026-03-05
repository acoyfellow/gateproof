<script lang="ts">
  import { defaultPlanTemplate } from '$lib/demo-content';

  interface Props {
    sectionId?: string;
    compact?: boolean;
  }

  let { sectionId, compact = false }: Props = $props();

  let planCode = $state(defaultPlanTemplate);
  let running = $state(false);
  let runError = $state<string | null>(null);
  let runLogs = $state<string[]>([]);
  let apiUrl = $state('https://httpbin.org');
  let testUrl = $state('https://example.com');
  let runStartedAt = $state<number | null>(null);
  let elapsedMs = $state(0);
  let timer: ReturnType<typeof setInterval> | null = null;
  let runMeta = $state<{ sandboxId?: string; processId?: string } | null>(null);

  function downloadPlan() {
    const blob = new Blob([planCode], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plan.ts';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(planCode);
  }

  async function runInSandbox() {
    running = true;
    runError = null;
    runLogs = [];
    runMeta = null;
    runStartedAt = Date.now();
    elapsedMs = 0;
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (runStartedAt) elapsedMs = Date.now() - runStartedAt;
    }, 500);

    try {
      const response = await fetch('/api/prd/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prdFile: planCode,
          apiUrl,
          testUrl,
        }),
      });

      if (!response.ok || !response.body) {
        const text = await response.text();
        throw new Error(text || 'Failed to start sandbox run');
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
            if (eventType === 'meta') {
              runMeta = { sandboxId: data.sandboxId, processId: data.processId };
            } else if (eventType === 'stdout' || eventType === 'stderr') {
              runLogs = [...runLogs, data.data];
            } else if (eventType === 'complete') {
              const statusLabel = data.exitCode != null ? `exit ${data.exitCode}` : data.status;
              runLogs = [...runLogs, `\n[${statusLabel}]`];
            } else if (eventType === 'error') {
              runError = data.error || 'Sandbox execution failed';
            }
          } catch {
            runLogs = [...runLogs, dataPayload];
          }
        }
      }
    } catch (err) {
      runError = err instanceof Error ? err.message : 'Unknown error occurred';
    } finally {
      running = false;
      runStartedAt = null;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
  }

  async function cancelRun() {
    if (!runMeta?.sandboxId || !runMeta?.processId) return;
    try {
      await fetch('/api/prd/run/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runMeta),
      });
      runLogs = [...runLogs, '\n[run cancelled]'];
    } catch (err) {
      runError = err instanceof Error ? err.message : 'Failed to cancel run';
    }
  }
</script>

<section id={sectionId} class={`relative flex items-center justify-center px-4 sm:px-8 ${compact ? 'py-6' : 'py-40'}`}>
  <div class="relative z-10 w-full max-w-5xl mx-auto">
    {#if !compact}
      <h2 class="text-4xl sm:text-5xl md:text-6xl font-bold text-center mb-4 text-white">
        <span class="text-amber-300">Plan</span> Builder
      </h2>
      <p class="text-center text-lg sm:text-xl text-white/80 mb-8 max-w-2xl mx-auto text-balance">
        Edit the plan, run in sandbox. Real gateproof API.
      </p>
    {/if}

    <div class={`bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg ${compact ? 'p-4' : 'p-6'} mb-6`}>
      <label for="plan-code" class="block text-sm font-semibold text-white mb-2">plan.ts</label>
      <textarea
        id="plan-code"
        bind:value={planCode}
        class={`w-full ${compact ? 'h-48' : 'h-64'} px-4 py-3 bg-black/60 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20 resize-none font-mono text-sm`}
        disabled={running}
        spellcheck="false"
      ></textarea>
    </div>

    <div class="flex flex-wrap justify-center gap-3 mb-6">
      <button
        onclick={runInSandbox}
        disabled={running || !planCode.trim()}
        class="px-8 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
      >
        {running ? 'Running...' : 'Run in sandbox'}
      </button>
      <button
        onclick={downloadPlan}
        class="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
      >
        Download plan.ts
      </button>
      {#if running}
        <button
          onclick={cancelRun}
          class="px-8 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-200 font-medium rounded-lg transition-colors"
        >
          Cancel
        </button>
      {/if}
    </div>

    {#if runError}
      <div class="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
        <p class="text-red-200 text-sm">{runError}</p>
      </div>
    {/if}

    {#if runLogs.length > 0}
      <div class="bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden mb-6">
        <div class="bg-gray-900/80 px-4 py-3 flex items-center justify-between border-b border-white/10">
          <p class="text-sm font-semibold text-white">
            Output {#if elapsedMs}({Math.round(elapsedMs / 1000)}s){/if}
          </p>
        </div>
        <pre class="p-4 overflow-x-auto text-xs text-white/90 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">{runLogs.join('')}</pre>
      </div>
    {/if}
  </div>
</section>
