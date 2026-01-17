<section class="relative min-h-screen flex items-center justify-center overflow-hidden">
  <!-- Full bleed background image -->
  <div 
    class="absolute inset-0 bg-cover bg-center bg-no-repeat"
    style="background-image: url('/transition.jpg');"
  >
    <!-- Gradient overlay for text readability - darker on left, lighter on right -->
    <div 
      class="absolute inset-0"
      style="background: linear-gradient(90deg, 
        rgba(0, 0, 0, 0.7) 0%, 
        rgba(0, 0, 0, 0.5) 30%,
        rgba(0, 0, 0, 0.3) 50%,
        rgba(255, 255, 255, 0.2) 70%,
        rgba(255, 255, 255, 0.1) 100%
      );"
    ></div>
  </div>
  
  <!-- Content -->
  <div class="relative z-10 flex flex-col items-center gap-12 px-4 text-center max-w-5xl mx-auto">
    <h2 class="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-tight">
      <span class="text-white">From Chaos</span><br/>
      <span class="text-amber-300">to Order</span>
    </h2>
    
    <p class="text-xl sm:text-2xl md:text-3xl font-medium max-w-3xl leading-relaxed text-white drop-shadow-lg">
      Passing through the threshold<br/>
      <span class="text-amber-300">from chaos to order</span>
    </p>
  </div>
</section>
