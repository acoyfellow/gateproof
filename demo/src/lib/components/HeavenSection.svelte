<script lang="ts">
  interface Props {
    onInfoClick?: () => void;
  }
  
  let { onInfoClick }: Props = $props();
  
  type GateState = 'idle' | 'running' | 'success' | 'failed';
  type LogLine = {
    timestamp: string;
    level: string;
    message: string;
    action?: string;
    stage?: string;
  };
  
  let state = $state<GateState>('idle');
  let logs = $state<LogLine[]>([]);
  let result = $state<{
    status: string;
    durationMs: number;
    evidence: {
      actionsSeen: string[];
      stagesSeen: string[];
      errorTags: string[];
    };
    error?: { message: string; name: string };
  } | null>(null);
  
  async function runGate() {
    state = 'running';
    logs = [];
    result = null;
    
    try {
      const response = await fetch('/api/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.error) {
        state = 'failed';
        result = {
          status: 'failed',
          durationMs: 0,
          evidence: { actionsSeen: [], stagesSeen: [], errorTags: [] },
          error: { message: data.message, name: 'GateError' }
        };
        return;
      }
      
      result = {
        status: data.status,
        durationMs: data.durationMs,
        evidence: data.evidence,
        error: data.error
      };
      
      logs = data.logs || [];
      state = data.status === 'success' ? 'success' : 'failed';
    } catch (error) {
      state = 'failed';
      result = {
        status: 'failed',
        durationMs: 0,
        evidence: { actionsSeen: [], stagesSeen: [], errorTags: [] },
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: error instanceof Error ? error.name : 'Error'
        }
      };
    }
  }
  
  function resetGate() {
    state = 'idle';
    logs = [];
    result = null;
  }
</script>

<section class="relative min-h-screen flex items-center justify-center overflow-hidden">
  <!-- Full bleed background image -->
  <div 
    class="absolute inset-0 bg-cover bg-center bg-no-repeat"
    style="background-image: url('/heaven.jpg');"
  >
    <!-- Gold overlay for text readability -->
    <div class="absolute inset-0 bg-amber-50/30"></div>
  </div>
  
  <!-- Content -->
  <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-16 text-balance">
    <!-- Header -->
    <div class="text-center mb-12 md:mb-16">
      <h2 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-amber-900 leading-tight">
        The Order
      </h2>
      <p class="text-xl sm:text-2xl md:text-3xl max-w-3xl mx-auto text-amber-800 leading-relaxed">
        The observation layer for building software in reverse. Define constraints. Let AI build within them. Validate against reality.
      </p>
    </div>
    
    <!-- Two column layout -->
    <div class="grid lg:grid-cols-2 gap-12 lg:gap-16">
      <!-- Left: Explanation -->
      <div class="space-y-8">
        <!-- The Inversion -->
        <div class="p-8 bg-amber-50/90 backdrop-blur-sm border border-amber-200/60 rounded-lg shadow-lg">
          <h3 class="text-2xl font-bold mb-4 text-amber-900">The Inversion</h3>
          <p class="text-lg leading-relaxed mb-6 text-amber-800">
            Software development is inverting. The question is not whether AI will write code—it is whether we will control it or it will control us.
          </p>
          <div class="grid sm:grid-cols-2 gap-4">
            <div class="p-4 rounded-lg bg-amber-100/90 border border-amber-300/60">
              <p class="text-xs uppercase tracking-wider mb-2 font-semibold text-amber-800">Before</p>
              <p class="text-sm text-amber-900">Humans write, debug, maintain. Every feature manually implemented.</p>
            </div>
            <div class="p-4 rounded-lg bg-amber-200/90 border border-amber-400/60">
              <p class="text-xs uppercase tracking-wider mb-2 font-semibold text-amber-900">After</p>
              <p class="text-sm text-amber-900">Humans define constraints. AI builds within them. Systems validate.</p>
            </div>
          </div>
        </div>
        
        <!-- Three Primitives -->
        <div class="p-8 bg-amber-50/90 backdrop-blur-sm border border-amber-200/60 rounded-lg shadow-lg">
          <h3 class="text-2xl font-bold mb-6 text-amber-900">Three Primitives</h3>
          <div class="space-y-4">
            <div class="p-4 rounded-lg bg-amber-100/80">
              <p class="text-lg font-semibold text-amber-900 mb-2">Observe</p>
              <p class="text-base text-amber-800">Connect to observability backends. Stream real logs from production.</p>
            </div>
            <div class="p-4 rounded-lg bg-amber-100/80">
              <p class="text-lg font-semibold text-amber-900 mb-2">Act</p>
              <p class="text-base text-amber-800">Trigger actions—deploy, automate, execute—that generate observable behavior.</p>
            </div>
            <div class="p-4 rounded-lg bg-amber-100/80">
              <p class="text-lg font-semibold text-amber-900 mb-2">Assert</p>
              <p class="text-base text-amber-800">Validate that logs match constraints. Real logs from real systems.</p>
            </div>
          </div>
        </div>
        
        <button
          onclick={() => onInfoClick?.()}
          class="text-base font-medium text-amber-600 hover:text-amber-700 transition-colors"
        >
          Read full documentation →
        </button>
      </div>
      
      <!-- Right: Real Gate Demo -->
      <div class="lg:sticky lg:top-8 h-fit">
        <div class="p-8 bg-amber-50/90 backdrop-blur-sm border border-amber-200/60 rounded-lg shadow-lg">
          <!-- Terminal header -->
          <div class="flex items-center justify-between mb-4 pb-4 border-b border-amber-300/50">
            <div class="flex items-center gap-2">
              <div class="flex gap-1.5">
                <div class="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <div class="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                <div class="w-2.5 h-2.5 rounded-full bg-green-500"></div>
              </div>
              <span class="text-xs ml-2 text-amber-700 font-mono">gateproof test</span>
            </div>
            <div class="flex items-center gap-2">
              {#if state === 'running'}
                <span class="text-xs text-amber-600 font-medium">Running...</span>
              {:else if state === 'success'}
                <span class="text-xs text-green-600 font-medium">Success</span>
              {:else if state === 'failed'}
                <span class="text-xs text-red-600 font-medium">Failed</span>
              {:else}
                <span class="text-xs text-amber-600 font-medium">Ready</span>
              {/if}
            </div>
          </div>
          
          <!-- Terminal content -->
          <div class="h-64 overflow-y-auto p-4 font-mono text-xs bg-gray-900 rounded mb-4">
            {#if state === 'idle'}
              <div class="flex items-center gap-2 text-gray-400">
                <span class="text-amber-400">$</span>
                <span>Ready to run gate...</span>
              </div>
            {:else if state === 'running'}
              <div class="flex items-center gap-2 text-gray-400 mb-2">
                <span class="text-amber-400">$</span>
                <span>Running gate...</span>
              </div>
              {#if logs.length > 0}
                {#each logs as log}
                  <div class="flex gap-2 mb-1 text-gray-300">
                    <span class="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span class={log.level === 'error' ? 'text-red-400' : 'text-gray-300'}>
                      {log.message}
                    </span>
                  </div>
                {/each}
              {/if}
            {:else if result}
              {#if result.status === 'success'}
                <div class="text-green-400 mb-2">✅ Gate passed</div>
                <div class="text-gray-400 text-xs mb-2">
                  Duration: {result.durationMs}ms
                </div>
                {#if result.evidence.actionsSeen.length > 0}
                  <div class="text-gray-300 mb-2">
                    Actions: {result.evidence.actionsSeen.join(', ')}
                  </div>
                {/if}
                {#if logs.length > 0}
                  {#each logs as log}
                    <div class="flex gap-2 mb-1 text-gray-300">
                      <span class="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span>{log.message}</span>
                    </div>
                  {/each}
                {/if}
              {:else}
                <div class="text-red-400 mb-2">❌ Gate failed</div>
                {#if result.error}
                  <div class="text-red-300 text-xs mb-2">{result.error.message}</div>
                {/if}
                {#if logs.length > 0}
                  {#each logs as log}
                    <div class="flex gap-2 mb-1 text-gray-300">
                      <span class="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span class={log.level === 'error' ? 'text-red-400' : 'text-gray-300'}>
                        {log.message}
                      </span>
                    </div>
                  {/each}
                {/if}
              {/if}
            {/if}
          </div>
          
          <!-- Terminal footer -->
          <div class="flex items-center gap-3">
            <button
              onclick={runGate}
              disabled={state === 'running'}
              class="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 bg-amber-500 hover:bg-amber-600 text-white rounded"
            >
              <span>Run Gate</span>
            </button>
            {#if state !== 'idle'}
              <button
                onclick={resetGate}
                class="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border border-amber-300 text-amber-700 rounded hover:bg-amber-100"
              >
                <span>Reset</span>
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
