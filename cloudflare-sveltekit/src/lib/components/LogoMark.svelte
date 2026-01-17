<script lang="ts">
  interface Props {
    size?: number;
    className?: string;
  }
  
  let { size = 28, className = "" }: Props = $props();
</script>

<svg 
  viewBox="0 0 100 100" 
  width={size} 
  height={size} 
  class="opacity-60 hover:opacity-100 transition-opacity {className}"
>
  <defs>
    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="oklch(0.35 0.03 35)" />
      <stop offset="100%" stop-color="oklch(0.2 0.02 30)" />
    </linearGradient>
    <radialGradient id="logoCoreGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="oklch(0.9 0.2 42)" />
      <stop offset="100%" stop-color="oklch(0.65 0.2 35)" />
    </radialGradient>
    <filter id="logoGlow">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <rect x="15" y="25" width="12" height="75" fill="url(#logoGrad)" />
  <rect x="73" y="25" width="12" height="75" fill="url(#logoGrad)" />
  <path d="M 21 25 Q 50 5 79 25" fill="none" stroke="url(#logoGrad)" stroke-width="8" stroke-linecap="round" />
  <circle cx="50" cy="55" r="12" fill="url(#logoCoreGrad)" filter="url(#logoGlow)" />
  <circle cx="50" cy="55" r="4" fill="oklch(0.15 0.02 30)" />
</svg>
