<script>
  import "../app.css";
</script>

<header class="sticky top-0 z-100 border-b border-border/60 bg-background/10 backdrop-blur-xl shadow-lg shadow-black/10">
  <div class="mx-auto flex items-center justify-between px-4 py-3 sm:px-8 max-w-6xl">
    <a href="/" class="flex items-center gap-2 text-foreground hover:opacity-90">
      <img src="/logo.svg" alt="Gateproof" class="h-12 w-auto min-h-12" width="46" height="15" />
    </a>
    <nav class="flex items-center gap-6 text-sm">
      <a href="/docs" class="text-muted-foreground hover:text-foreground">Docs</a>
      <a href="/case-studies" class="text-muted-foreground hover:text-foreground">Case Studies</a>
    </nav>
  </div>
</header>
<slot />
