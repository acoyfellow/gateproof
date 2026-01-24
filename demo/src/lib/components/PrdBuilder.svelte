<script lang="ts">
  import CodeBlock from './CodeBlock.svelte';
  
  const examples = [
    {
      name: 'Simple API Health Check',
      prompt: `API responds without errors
API returns 200 status code`
    },
    {
      name: 'User Signup Flow',
      prompt: `User can sign up
User receives verification email (depends on signup)
User can log in after verification (depends on email verification)`
    },
    {
      name: 'E-commerce Checkout',
      prompt: `Product page loads
Add to cart works
Checkout process completes
Payment is processed (depends on checkout)
Order confirmation email sent (depends on payment)`
    },
    {
      name: 'API Integration',
      prompt: `External API connection established
Data is fetched successfully
Data is transformed correctly
Transformed data is saved to database (depends on data transformation)`
    },
    {
      name: 'Authentication Flow',
      prompt: `User can register
User can log in
User session is created (depends on login)
Protected route requires authentication (depends on session)
User can log out`
    }
  ];
  
  let descriptions = $state('');
  let loading = $state(false);
  let generatedCode = $state<string | null>(null);
  let error = $state<string | null>(null);
  
  async function generatePrd() {
    if (!descriptions.trim()) {
      error = 'Please enter story descriptions';
      return;
    }
    
    loading = true;
    error = null;
    generatedCode = null;
    
    try {
      const response = await fetch('/api/prd/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptions }),
      });
      
      const data = (await response.json()) as {
        success?: boolean;
        prdFile?: string;
        error?: string;
        message?: string;
      };
      
      if (!response.ok) {
        error = data.message || data.error || 'Failed to generate PRD';
        return;
      }
      
      if (data.prdFile) {
        generatedCode = data.prdFile;
      } else {
        error = 'No PRD file generated';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
    } finally {
      loading = false;
    }
  }
  
  function copyToClipboard() {
    if (!generatedCode) return;
    
    navigator.clipboard.writeText(generatedCode).then(() => {
      // Simple feedback - could enhance with toast
      const button = document.querySelector('[data-copy-btn]') as HTMLButtonElement;
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
    }).catch(() => {
      error = 'Failed to copy to clipboard';
    });
  }
  
  function downloadPrd() {
    if (!generatedCode) return;
    
    const blob = new Blob([generatedCode], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prd.ts';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

<section class="relative flex items-center justify-center py-40 px-4 sm:px-8">
  <div class="relative z-10 w-full max-w-5xl mx-auto">
    <h2 class="text-4xl sm:text-5xl md:text-6xl font-bold text-center mb-4 text-white">
      <span class="text-amber-300">PRD</span> Builder
    </h2>
    
    <p class="text-center text-lg sm:text-xl text-white/80 mb-8 max-w-2xl mx-auto text-balance">
      Describe your stories. AI generates a complete <code class="text-amber-300">prd.ts</code> file.
    </p>
    
    <div class="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-6 mb-6">
      <div class="mb-4">
        <div class="block text-xs font-semibold text-white/80 mb-2">
          Try an example
        </div>
        <div class="flex flex-wrap gap-2">
          {#each examples as example}
            <button
              onclick={() => { descriptions = example.prompt; }}
              class="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-300/30 text-white rounded transition-colors"
            >
              {example.name}
            </button>
          {/each}
        </div>
      </div>
      
      <label for="descriptions" class="block text-sm font-semibold text-white mb-2">
        Story Descriptions
      </label>
      <textarea
        id="descriptions"
        bind:value={descriptions}
        placeholder="User can sign up&#10;User receives verification email (depends on signup)&#10;API responds without errors"
        class="w-full h-32 px-4 py-3 bg-black/60 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20 resize-none font-mono text-sm"
        disabled={loading}
      ></textarea>
      <p class="text-xs text-white/60 mt-2">
        Enter one story per line. Mention dependencies in parentheses, e.g., "(depends on signup)"
      </p>
    </div>
    
    <div class="flex justify-center mb-6">
      <button
        onclick={generatePrd}
        disabled={loading || !descriptions.trim()}
        class="px-8 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
      >
        {#if loading}
          Generating...
        {:else}
          Generate PRD
        {/if}
      </button>
    </div>
    
    {#if error}
      <div class="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
        <p class="text-red-200 text-sm">{error}</p>
      </div>
    {/if}
    
    {#if generatedCode}
      <div class="bg-black/60 backdrop-blur-sm border border-amber-300/30 rounded-lg shadow-xl overflow-hidden">
        <div class="bg-gray-900/80 px-4 py-3 flex items-center justify-between border-b border-white/10">
          <p class="text-sm font-semibold text-white">Generated prd.ts</p>
          <div class="flex gap-2">
            <button
              data-copy-btn
              onclick={copyToClipboard}
              class="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
            >
              Copy
            </button>
            <button
              onclick={downloadPrd}
              class="px-3 py-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded transition-colors"
            >
              Download
            </button>
          </div>
        </div>
        <div class="p-4 overflow-x-auto">
          <CodeBlock code={generatedCode} language="typescript" />
        </div>
      </div>
    {/if}
  </div>
</section>
