<script lang="ts">
  import { browser } from '$app/environment';
  
  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }
  
  let { isOpen, onClose }: Props = $props();
  
  let closing = $state(false);
  let readmeHtml = $state<string>('');
  let loading = $state(false);
  let error = $state<string | null>(null);
  
  function handleClose() {
    // trigger closing animation, then notify parent
    closing = true;
    setTimeout(() => {
      onClose();
    }, 300);
  }
  
  async function loadReadme() {
    if (!browser) return;
    if (readmeHtml) return; // Already loaded
    
    loading = true;
    error = null;
    
    try {
      // Dynamically import marked to ensure it's available
      const { marked } = await import('marked');
      
      // Fetch markdown from static folder
      const response = await fetch('/README.md');
      if (!response.ok) {
        throw new Error(`Failed to load README: ${response.status} ${response.statusText}`);
      }
      const markdown = await response.text();
      
      // Parse markdown to HTML
      readmeHtml = await marked.parse(markdown);
    } catch (err) {
      console.error('Error loading README:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }
  
  $effect(() => {
    if (isOpen && browser) {
      // reset closing flag when drawer is (re)opened
      closing = false;

      if (!readmeHtml && !loading) {
        loadReadme();
      }
    }
  });
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 {closing ? 'fade-out' : 'fade-in'}"
    onclick={handleClose}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === 'Escape' && handleClose()}
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
        <h2 class="text-2xl font-bold text-white">Documentation</h2>
        <button
          onclick={handleClose}
          class="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <!-- README Content -->
      {#if loading}
        <div class="flex items-center justify-center py-12">
          <div class="text-gray-400">Loading...</div>
        </div>
      {:else if error}
        <div class="text-red-400 py-12">
          <p class="font-semibold mb-2">Error loading documentation:</p>
          <p class="text-sm">{error}</p>
          <button
            onclick={loadReadme}
            class="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors"
          >
            Retry
          </button>
        </div>
      {:else if readmeHtml}
        <div class="readme-content prose prose-invert prose-amber max-w-none">
          {@html readmeHtml}
        </div>
      {:else}
        <div class="flex items-center justify-center py-12">
          <button
            onclick={loadReadme}
            class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors"
          >
            Load Documentation
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  :global(.readme-content) {
    color: rgb(209 213 219);
  }
  
  :global(.readme-content h1) {
    color: white;
    font-size: 2rem;
    font-weight: bold;
    margin-top: 0;
    margin-bottom: 1rem;
  }
  
  :global(.readme-content h2) {
    color: white;
    font-size: 1.5rem;
    font-weight: bold;
    margin-top: 2rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid rgb(75 85 99);
    padding-bottom: 0.5rem;
  }
  
  :global(.readme-content h3) {
    color: rgb(251 191 36);
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
  }
  
  :global(.readme-content code) {
    background: rgb(17 24 39);
    color: rgb(251 191 36);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
    font-family: 'Courier New', monospace;
  }
  
  :global(.readme-content pre) {
    background: rgb(17 24 39);
    color: rgb(209 213 219);
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1rem 0;
    border: 1px solid rgb(55 65 81);
  }
  
  :global(.readme-content pre code) {
    background: transparent;
    color: inherit;
    padding: 0;
  }
  
  :global(.readme-content a) {
    color: rgb(251 191 36);
    text-decoration: underline;
  }
  
  :global(.readme-content a:hover) {
    color: rgb(251 191 36);
    opacity: 0.8;
  }
  
  :global(.readme-content ul, .readme-content ol) {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }
  
  :global(.readme-content li) {
    margin: 0.5rem 0;
  }
  
  :global(.readme-content p) {
    margin: 1rem 0;
    line-height: 1.6;
  }
  
  :global(.readme-content strong) {
    color: white;
    font-weight: 600;
  }
  
  :global(.readme-content blockquote) {
    border-left: 4px solid rgb(251 191 36);
    padding-left: 1rem;
    margin: 1rem 0;
    color: rgb(156 163 175);
  }
</style>
