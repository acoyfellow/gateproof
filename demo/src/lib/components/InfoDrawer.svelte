<script lang="ts">
  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }
  
  let { isOpen, onClose }: Props = $props();
  
  let closing = $state(false);
  
  function handleClose() {
    closing = true;
    setTimeout(() => {
      onClose();
    }, 300);
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 {closing ? 'fade-out' : 'fade-in'}"
    on:click={handleClose}
    role="button"
    tabindex="0"
    on:keydown={(e) => e.key === 'Escape' && handleClose()}
  ></div>
  
  <!-- Drawer -->
  <div
    class="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto {closing ? 'slide-down' : 'slide-up'}"
    style="background: linear-gradient(180deg, oklch(0.08 0.02 30) 0%, oklch(0.04 0.01 25) 100%); border-top: 1px solid oklch(0.2 0.03 35);"
  >
    <!-- Handle -->
    <div class="sticky top-0 flex justify-center pt-3 pb-2 bg-inherit z-10">
      <div class="w-12 h-1 rounded-full bg-gray-500/30"></div>
    </div>
    
    <!-- Content -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">About gateproof</h2>
        <button
          on:click={handleClose}
          class="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <!-- Overview -->
      <div class="mb-8">
        <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-500">
            <path d="M4 10v9"/>
            <path d="m2 2 20 20"/>
            <path d="M12 2v8"/>
            <path d="M12 18v4"/>
            <path d="M8 12h8"/>
          </svg>
          Overview
        </h3>
        <p class="text-gray-300 leading-relaxed">
          gateproof is the observation layer for building software in reverse. Instead of writing code and hoping it works,
          you define what should happen, let AI build within those constraints, and validate against real system behavior.
        </p>
      </div>
      
      <!-- How it works -->
      <div class="mb-8">
        <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-500">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <path d="M9 9h6v6H9z"/>
          </svg>
          How it works
        </h3>
        <div class="space-y-4">
          <div class="flex gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-500 shrink-0 mt-0.5">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <div>
              <p class="text-white font-medium mb-1">Observe</p>
              <p class="text-gray-300 text-sm">Connect to your observability backend and stream real logs from production systems.</p>
            </div>
          </div>
          <div class="flex gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-500 shrink-0 mt-0.5">
              <path d="M4 10v9"/>
              <path d="m2 2 20 20"/>
              <path d="M12 2v8"/>
              <path d="M12 18v4"/>
              <path d="M8 12h8"/>
            </svg>
            <div>
              <p class="text-white font-medium mb-1">Act</p>
              <p class="text-gray-300 text-sm">Trigger actions—deploy, automate, execute—that generate observable behavior.</p>
            </div>
          </div>
          <div class="flex gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-500 shrink-0 mt-0.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <div>
              <p class="text-white font-medium mb-1">Assert</p>
              <p class="text-gray-300 text-sm">Validate that logs match your defined constraints. Real logs from real systems.</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Links -->
      <div class="flex flex-wrap gap-4">
        <a
          href="https://github.com/acoyfellow/gateproof"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-2 px-4 py-2 border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white rounded transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
            <path d="M9 18c-4.51 2-5-2-7-2"/>
          </svg>
          <span>GitHub</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
        <button
          on:click={handleClose}
          class="flex items-center gap-2 px-4 py-2 border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white rounded transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
          </svg>
          <span>Documentation</span>
        </button>
      </div>
    </div>
  </div>
{/if}
