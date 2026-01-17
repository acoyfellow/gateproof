<script lang="ts">
  import { onMount } from 'svelte';
  
  interface Props {
    onInfoClick?: () => void;
  }
  
  let { onInfoClick }: Props = $props();
  
  type DemoState = 'idle' | 'observing' | 'acting' | 'asserting' | 'success' | 'failure';
  
  interface LogLine {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
  }
  
  let mounted = $state(false);
  let state = $state<DemoState>('idle');
  let logs = $state<LogLine[]>([]);
  
  onMount(() => {
    mounted = true;
  });
  
  function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  function addLog(level: LogLine['level'], message: string) {
    logs = [...logs, {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message
    }];
  }
  
  async function runDemo() {
    state = 'observing';
    logs = [];
    
    await delay(500);
    addLog('info', 'Connecting to observability backend...');
    await delay(800);
    addLog('info', 'Streaming logs from production worker...');
    await delay(600);
    addLog('success', 'Log stream established');
    
    state = 'acting';
    await delay(400);
    addLog('info', 'Triggering test endpoint...');
    await delay(600);
    addLog('info', 'Request sent to /api/test');
    await delay(500);
    addLog('success', 'Response received (200 OK)');
    
    state = 'asserting';
    await delay(400);
    addLog('info', 'Validating log constraints...');
    await delay(700);
    addLog('info', '✓ No errors detected');
    await delay(500);
    addLog('info', '✓ Action "request_received" found');
    await delay(400);
    addLog('success', 'All assertions passed');
    
    state = 'success';
    await delay(300);
    addLog('success', 'Test completed successfully');
  }
  
  function resetDemo() {
    state = 'idle';
    logs = [];
  }
</script>

{#if mounted}
  <section class="relative min-h-screen overflow-hidden bg-white">
    <!-- Content container -->
    <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <!-- Header -->
      <div class="text-center mb-8 md:mb-12">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 mb-4 border border-gray-200 rounded-full bg-gray-50">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-600">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          </svg>
          <span class="text-xs font-medium text-gray-700">The Order</span>
        </div>
        <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 text-gray-900">
          gateproof
        </h2>
        <p class="text-sm sm:text-base max-w-xl mx-auto text-gray-600">
          The observation layer for building software in reverse. Define constraints. Let AI build within them. Validate against reality.
        </p>
      </div>
      
      <!-- Two column layout -->
      <div class="grid lg:grid-cols-2 gap-8 lg:gap-12">
        <!-- Left: Explanation -->
        <div class="space-y-6">
          <!-- The Inversion -->
          <div class="p-5 sm:p-6 rounded-sm bg-white border border-gray-200">
            <div class="flex items-center gap-2 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-600">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <h3 class="text-base font-semibold text-gray-900">The Inversion</h3>
            </div>
            <p class="text-sm leading-relaxed mb-4 text-gray-600">
              Software development is inverting. The question is not whether AI will write code—it is whether we will control it or it will control us.
            </p>
            <div class="grid sm:grid-cols-2 gap-3">
              <div class="p-3 rounded-sm bg-pink-50 border border-pink-200">
                <p class="text-[10px] uppercase tracking-wider mb-1 text-pink-700">Before</p>
                <p class="text-xs text-gray-900">Humans write, debug, maintain. Every feature manually implemented.</p>
              </div>
              <div class="p-3 rounded-sm bg-amber-50 border border-amber-200">
                <p class="text-[10px] uppercase tracking-wider mb-1 text-amber-700">After</p>
                <p class="text-xs text-gray-900">Humans define constraints. AI builds within them. Systems validate.</p>
              </div>
            </div>
          </div>
          
          <!-- Three Primitives -->
          <div class="p-5 sm:p-6 rounded-sm bg-white border border-gray-200">
            <div class="flex items-center gap-2 mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-600">
                <polyline points="4 17 10 11 4 5"/>
                <line x1="12" x2="20" y1="19" y2="19"/>
              </svg>
              <h3 class="text-base font-semibold text-gray-900">Three Primitives</h3>
            </div>
            <div class="space-y-3">
              <div class="flex gap-3 p-3 rounded-sm bg-gray-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mt-0.5 shrink-0 text-amber-600">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <div>
                  <p class="text-sm font-medium text-gray-900">Observe</p>
                  <p class="text-xs text-gray-600">Connect to observability backends. Stream real logs from production.</p>
                </div>
              </div>
              <div class="flex gap-3 p-3 rounded-sm bg-gray-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mt-0.5 shrink-0 text-amber-600">
                  <polyline points="4 17 10 11 4 5"/>
                  <line x1="12" x2="20" y1="19" y2="19"/>
                </svg>
                <div>
                  <p class="text-sm font-medium text-gray-900">Act</p>
                  <p class="text-xs text-gray-600">Trigger actions—deploy, automate, execute—that generate observable behavior.</p>
                </div>
              </div>
              <div class="flex gap-3 p-3 rounded-sm bg-gray-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mt-0.5 shrink-0 text-amber-600">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <div>
                  <p class="text-sm font-medium text-gray-900">Assert</p>
                  <p class="text-xs text-gray-600">Validate that logs match constraints. Real logs from real systems.</p>
                </div>
              </div>
            </div>
          </div>
          
          <button
            on:click={() => onInfoClick?.()}
            class="flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
            </svg>
            <span>Read full documentation</span>
          </button>
        </div>
        
        <!-- Right: Demo Terminal -->
        <div class="lg:sticky lg:top-8 h-fit">
          <div class="rounded-sm overflow-hidden bg-white border border-gray-200 shadow-lg">
            <!-- Terminal header -->
            <div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div class="flex items-center gap-2">
                <div class="flex gap-1.5">
                  <div class="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div class="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <div class="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                </div>
                <span class="text-xs ml-2 hidden sm:inline text-gray-600">gateproof test</span>
              </div>
              <div class="flex items-center gap-2">
                {#if state === 'observing'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-500 animate-pulse">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                {:else if state === 'acting'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-500 animate-pulse">
                    <polyline points="4 17 10 11 4 5"/>
                    <line x1="12" x2="20" y1="19" y2="19"/>
                  </svg>
                {:else if state === 'asserting'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-500 animate-spin">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                {:else if state === 'success'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-green-500">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                {:else if state === 'failure'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-red-500">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                {:else}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-400">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                {/if}
                <span class="text-xs text-gray-600">
                  {state === 'observing' ? 'Observing...' : 
                   state === 'acting' ? 'Acting...' : 
                   state === 'asserting' ? 'Asserting...' : 
                   state === 'success' ? 'Validated' : 
                   state === 'failure' ? 'Failed' : 
                   'Ready'}
                </span>
              </div>
            </div>
            
            <!-- Terminal content -->
            <div class="h-56 sm:h-64 overflow-y-auto p-4 font-mono text-xs bg-gray-900" id="terminalLogs">
              {#if logs.length === 0 && state === 'idle'}
                <div class="flex items-center gap-2 text-gray-400">
                  <span class="text-amber-400">$</span>
                  <span>Ready to run test...</span>
                  <span class="animate-pulse">_</span>
                </div>
              {:else}
                {#each logs as log}
                  <div class="flex gap-2 mb-1">
                    <span class="text-gray-500">{log.timestamp}</span>
                    <span 
                      class={
                        log.level === 'warn' ? 'text-yellow-400' :
                        log.level === 'error' ? 'text-red-400' :
                        log.level === 'success' ? 'text-green-400' :
                        'text-gray-300'
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                {/each}
              {/if}
            </div>
            
            <!-- Terminal footer -->
            <div class="flex items-center gap-3 px-4 py-3 bg-gray-50 border-t border-gray-200">
              <button
                on:click={runDemo}
                disabled={!['idle', 'success', 'failure'].includes(state)}
                class="flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50 bg-amber-500 hover:bg-amber-600 text-white rounded"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                <span>Run Test</span>
              </button>
              {#if ['success', 'failure'].includes(state)}
                <button
                  on:click={resetDemo}
                  class="flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors border border-gray-300 text-gray-700 rounded hover:bg-gray-100"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="1 4 1 10 7 10"/>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                  </svg>
                  <span>Reset</span>
                </button>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
{/if}
