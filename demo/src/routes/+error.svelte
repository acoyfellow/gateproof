<script lang="ts">
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";

  import { Home, ArrowLeft, RefreshCcw } from "@lucide/svelte";
  import SEO from "$lib/components/SEO.svelte";

  function getErrorTitle(status: number): string {
    switch (status) {
      case 404:
        return "Page Not Found";
      case 403:
        return "Access Denied";
      case 500:
        return "Server Error";
      default:
        return "Error";
    }
  }

  function getErrorDescription(status: number): string {
    switch (status) {
      case 404:
        return "The page you're looking for couldn't be found. It might have been moved or deleted.";
      case 403:
        return "You don't have permission to access this page. Please check your credentials.";
      case 500:
        return "Something went wrong on our end. Our team has been notified and we're working to fix it.";
      default:
        return "We're having trouble loading this page. You can try refreshing or going back to where you were.";
    }
  }

  // Use generic error messages instead of exposing raw error details
  let errorTitle = $derived(`${page.status} - ${getErrorTitle(page.status)}`);
  let errorMessage = $derived(getErrorTitle(page.status));
  let errorDescription = $derived(getErrorDescription(page.status));
</script>

<SEO
  title={errorTitle}
  description={errorDescription}
  keywords="error, not found, problem, issue"
  path={page.url.pathname}
  type="website"
  section="Error"
  tags="error"
/>

<div
  class="min-h-screen flex items-center justify-center px-8 py-20 text-center gap-4 flex-col"
>
  <h1 class="text-6xl font-bold text-primary-600">{page.status}</h1>

  <p class="text-2xl font-semibold text-zinc-900">
    {errorMessage}
  </p>

  <p class="text-xl text-zinc-800 text-balance max-w-lg mx-auto">
    {errorDescription}
  </p>

  <div class="flex gap-4 justify-center py-10 flex-col md:flex-row">
    <Button
      color="alternative"
      size="lg"
      onclick={() => history.back()}
      class="flex items-center gap-2 cursor-pointer"
    >
      <ArrowLeft class="w-4 h-4" />
      Go Back
    </Button>

    <Button
      color="alternative"
      size="lg"
      onclick={() => location.reload()}
      class="flex items-center gap-2 cursor-pointer"
    >
      <RefreshCcw class="w-4 h-4" />
      Try Again
    </Button>

    <Button color="primary" size="lg" href="/" class="flex items-center gap-2">
      <Home class="w-4 h-4" />
      Go Home
    </Button>
  </div>
</div>
