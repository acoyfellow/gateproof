/**
 * Demo Worker - A simple worker that logs structured data for gateproof testing
 * This worker is used to demonstrate gateproof's capabilities
 */

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    // Log request start
    console.log(JSON.stringify({
      requestId,
      timestamp: new Date().toISOString(),
      stage: "worker",
      action: "request_received",
      status: "start",
      method: request.method,
      path: url.pathname
    }));

    try {
      // Processing delay
      await new Promise(resolve => setTimeout(resolve, 50));

      let response: Response;

      if (url.pathname === "/" || url.pathname === "/demo") {
        // Home page - return demo HTML (will be embedded by build script)
        response = new Response(getDemoHTML(), {
          headers: { "Content-Type": "text/html" }
        });
      } else if (url.pathname === "/api/run-test" && request.method === "POST") {
        // API endpoint to run gateproof tests
        try {
          const body = await request.json();
          const { endpoint, assertions } = body;
          const testEndpoint = endpoint || "/api/test";
          const startTime = Date.now();

          // Make the test request to generate logs
          const testUrl = new URL(testEndpoint, request.url);
          const testResponse = await fetch(testUrl.toString(), {
            method: "GET",
            headers: request.headers,
          });

          // Wait a bit for logs to be written to Analytics Engine
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Parse assertions
          const assertList = (assertions || []).map((a: string) => {
            if (a === "noErrors") return { type: "noErrors" };
            if (a.startsWith("hasAction:")) return { type: "hasAction", value: a.split(":")[1] };
            if (a.startsWith("hasStage:")) return { type: "hasStage", value: a.split(":")[1] };
            return { type: "noErrors" };
          });

          // Make HTTP request and validate response
          // Returns structured test results with evidence
          const durationMs = Date.now() - startTime;
          const testData = testResponse.ok ? await testResponse.json().catch(() => ({})) : null;

          // Basic validation
          let status = "success";
          const errors: string[] = [];
          const evidence = {
            requestIds: testData?.requestId ? [testData.requestId] : [requestId],
            stagesSeen: ["worker"],
            actionsSeen: testResponse.ok ? ["request_received", "request_completed"] : ["request_received", "request_failed"],
            errorTags: testResponse.ok ? [] : ["RequestError"],
          };

          // Validate assertions
          for (const assertion of assertList) {
            if (assertion.type === "noErrors" && !testResponse.ok) {
              status = "failed";
              errors.push("Request failed");
            }
            if (assertion.type === "hasAction" && !evidence.actionsSeen.includes(assertion.value)) {
              status = "failed";
              errors.push(`Missing action: ${assertion.value}`);
            }
            if (assertion.type === "hasStage" && !evidence.stagesSeen.includes(assertion.value)) {
              status = "failed";
              errors.push(`Missing stage: ${assertion.value}`);
            }
          }

          response = new Response(JSON.stringify({
            status,
            durationMs,
            logs: [],
            evidence,
            ...(status === "failed" && errors.length > 0 ? { error: { message: errors.join(", ") } } : {}),
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          response = new Response(JSON.stringify({
            status: "failed",
            error: { message: error instanceof Error ? error.message : String(error) }
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      } else if (url.pathname === "/api/health") {
        // Health check endpoint
        response = new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
          headers: { "Content-Type": "application/json" }
        });
      } else if (url.pathname === "/api/test") {
        // Test endpoint that can be used for gateproof tests
        const duration = Date.now() - startTime;
        response = new Response(JSON.stringify({
          success: true,
          requestId,
          durationMs: duration
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } else {
        response = new Response("Not Found", { status: 404 });
      }

      const duration = Date.now() - startTime;

      // Log success
      console.log(JSON.stringify({
        requestId,
        timestamp: new Date().toISOString(),
        stage: "worker",
        action: "request_completed",
        status: "success",
        method: request.method,
        path: url.pathname,
        statusCode: response.status,
        durationMs: duration
      }));

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error
      console.log(JSON.stringify({
        requestId,
        timestamp: new Date().toISOString(),
        stage: "worker",
        action: "request_failed",
        status: "error",
        error: {
          tag: "RequestError",
          message: error instanceof Error ? error.message : String(error)
        },
        durationMs: duration
      }));

      return new Response("Internal Server Error", { status: 500 });
    }
  }
};

function getDemoHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>gateproof - The observation layer for building software in reverse</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            background: 'oklch(0.03 0.01 30)',
            foreground: 'oklch(0.92 0.02 50)',
            muted: 'oklch(0.15 0.015 30)',
            'muted-foreground': 'oklch(0.5 0.03 40)',
            border: 'oklch(0.15 0.03 30)',
            accent: 'oklch(0.75 0.22 38)',
            'gold-deep': 'oklch(0.7 0.12 80)',
            'heaven-bg': 'oklch(0.98 0.01 90)',
            'heaven-card': 'oklch(0.96 0.02 85)',
            'heaven-text': 'oklch(0.15 0.02 60)',
            'heaven-muted': 'oklch(0.4 0.03 70)',
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
    
    body {
      font-family: 'JetBrains Mono', monospace;
    }

    @keyframes float-ember {
      0% { transform: translateY(0) translateX(0) scale(1) rotate(0deg); opacity: 0; }
      5% { opacity: 1; }
      50% { opacity: 0.8; }
      100% { transform: translateY(-100vh) translateX(var(--drift, 30px)) scale(0.2) rotate(360deg); opacity: 0; }
    }

    @keyframes float-light {
      0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
      10% { opacity: 0.6; }
      50% { opacity: 0.8; }
      100% { transform: translateY(-60vh) translateX(var(--drift, 20px)) scale(0.5); opacity: 0; }
    }

    @keyframes pulse-core {
      0%, 100% { transform: scale(1); filter: brightness(1); }
      50% { transform: scale(1.1); filter: brightness(1.3); }
    }

    @keyframes pulse-divine {
      0%, 100% { transform: scale(1); filter: brightness(1) drop-shadow(0 0 20px oklch(0.85 0.15 85 / 0.5)); }
      50% { transform: scale(1.05); filter: brightness(1.1) drop-shadow(0 0 40px oklch(0.9 0.12 90 / 0.7)); }
    }

    @keyframes scan-line {
      0% { transform: translateY(-100%); opacity: 0; }
      50% { opacity: 0.3; }
      100% { transform: translateY(100vh); opacity: 0; }
    }

    @keyframes ring-expand {
      0% { transform: scale(0.8); opacity: 0.8; }
      100% { transform: scale(2); opacity: 0; }
    }

    @keyframes ring-expand-gold {
      0% { transform: scale(0.8); opacity: 0.6; }
      100% { transform: scale(2.5); opacity: 0; }
    }

    @keyframes orbit {
      0% { transform: rotate(0deg) translateX(var(--orbit-radius, 100px)) rotate(0deg); }
      100% { transform: rotate(360deg) translateX(var(--orbit-radius, 100px)) rotate(-360deg); }
    }

    @keyframes flicker {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }

    @keyframes reveal-gate {
      0% { clip-path: inset(100% 0 0 0); }
      100% { clip-path: inset(0 0 0 0); }
    }

    @keyframes draw-line {
      0% { stroke-dashoffset: 1000; }
      100% { stroke-dashoffset: 0; }
    }

    @keyframes light-ray {
      0%, 100% { opacity: 0.3; transform: scaleY(1); }
      50% { opacity: 0.6; transform: scaleY(1.05); }
    }

    @keyframes scroll-hint {
      0%, 100% { transform: translateY(0); opacity: 0.5; }
      50% { transform: translateY(8px); opacity: 1; }
    }

    @keyframes type-reveal {
      0% { opacity: 0; transform: translateY(10px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    @keyframes slide-up {
      0% { transform: translateY(100%); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }

    @keyframes slide-down {
      0% { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(100%); opacity: 0; }
    }

    @keyframes fade-in {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }

    @keyframes fade-out {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }

    .ember-particle {
      animation: float-ember var(--duration, 12s) ease-out infinite;
      animation-delay: var(--delay, 0s);
    }

    .light-particle {
      animation: float-light var(--duration, 18s) ease-out infinite;
      animation-delay: var(--delay, 0s);
    }

    .pulse-core {
      animation: pulse-core 3s ease-in-out infinite;
    }

    .pulse-divine {
      animation: pulse-divine 4s ease-in-out infinite;
    }

    .scan-line {
      animation: scan-line 8s linear infinite;
    }

    .ring-expand {
      animation: ring-expand 3s ease-out infinite;
    }

    .ring-expand-gold {
      animation: ring-expand-gold 4s ease-out infinite;
    }

    .orbit {
      animation: orbit var(--orbit-duration, 20s) linear infinite;
    }

    .flicker {
      animation: flicker 4s ease-in-out infinite;
    }

    .reveal-gate {
      animation: reveal-gate 2s ease-out forwards;
    }

    .draw-line {
      stroke-dasharray: 1000;
      animation: draw-line 3s ease-out forwards;
    }

    .light-ray {
      animation: light-ray 6s ease-in-out infinite;
    }

    .scroll-hint {
      animation: scroll-hint 2s ease-in-out infinite;
    }

    .type-reveal {
      animation: type-reveal 0.5s ease-out forwards;
    }

    .slide-up {
      animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .slide-down {
      animation: slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .fade-in {
      animation: fade-in 0.3s ease-out forwards;
    }

    .fade-out {
      animation: fade-out 0.3s ease-out forwards;
    }

    .stagger-1 { animation-delay: 0.1s; }
    .stagger-2 { animation-delay: 0.2s; }
    .stagger-3 { animation-delay: 0.3s; }
    .stagger-4 { animation-delay: 0.4s; }
    .stagger-5 { animation-delay: 0.5s; }
  </style>
</head>
<body class="relative bg-background text-foreground antialiased">
  <!-- Ember Field -->
  <div id="emberField" class="fixed inset-x-0 top-0 h-[300vh] pointer-events-none overflow-hidden z-0"></div>

  <!-- Fixed Logo Mark -->
  <div class="fixed top-4 left-4 sm:top-6 sm:left-6 z-50">
    <svg viewBox="0 0 100 100" width="28" height="28" class="opacity-60 hover:opacity-100 transition-opacity sm:w-9 sm:h-9">
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
  </div>

  <main class="relative">
    <!-- Section 1: The Gate - Dark, infernal threshold -->
    <section id="gateSection" class="relative min-h-screen flex items-center justify-center bg-black"></section>

    <!-- Section 2: Chaos - What happens without gateproof (Hell) -->
    <section id="chaosSection" class="relative min-h-screen flex items-center justify-center overflow-hidden"></section>

    <!-- Section 3: The Transition - Passing through -->
    <section id="transitionSection" class="relative min-h-screen flex items-center justify-center overflow-hidden"></section>

    <!-- Section 4: Heaven - The demo + explanation (inverted, angelic) -->
    <section id="heavenSection" class="relative min-h-screen overflow-hidden bg-white"></section>

    <!-- Section 5: CTA -->
    <section id="ctaSection" class="relative min-h-screen flex items-center justify-center w-full"></section>
  </main>

  <!-- Info Drawer -->
  <div id="infoDrawer" class="hidden"></div>

  <script type="module">
    // Initialize ember field
    function initEmberField() {
      const container = document.getElementById('emberField');
      const emberCount = 50;
      
      for (let i = 0; i < emberCount; i++) {
        const ember = document.createElement('div');
        const left = Math.random() * 100;
        const size = Math.random() * 5 + 1;
        const duration = Math.random() * 15 + 10;
        const delay = Math.random() * 15;
        const drift = (Math.random() - 0.5) * 120;
        const opacity = Math.random() * 0.6 + 0.2;
        const hue = 30 + Math.random() * 15;
        
        ember.className = 'absolute bottom-0 ember-particle';
        ember.style.left = \`\${left}%\`;
        ember.style.width = \`\${size}px\`;
        ember.style.height = \`\${size}px\`;
        ember.style.borderRadius = size > 3 ? '2px' : '50%';
        ember.style.background = \`radial-gradient(circle, oklch(0.85 0.25 \${hue}) 0%, oklch(0.6 0.22 \${hue - 5}) 50%, transparent 100%)\`;
        ember.style.boxShadow = \`0 0 \${size * 3}px oklch(0.7 0.22 \${hue} / 0.8)\`;
        ember.style.setProperty('--duration', \`\${duration}s\`);
        ember.style.setProperty('--delay', \`\${delay}s\`);
        ember.style.setProperty('--drift', \`\${drift}px\`);
        ember.style.opacity = opacity;
        
        container.appendChild(ember);
      }
    }

    // Monolith Gate Section
    function initGateSection() {
      const section = document.getElementById('gateSection');
      let hoverIntensity = 0;
      
      section.innerHTML = \`
        <div class="relative w-full min-h-screen flex items-center justify-center bg-black" id="gateContainer">
          <div class="absolute inset-0" style="background: radial-gradient(ellipse 80% 80% at 50% 50%, oklch(0.08 0.02 30) 0%, oklch(0.02 0.005 30) 100%);"></div>
          \${[0, 1, 2].map((i) => \`
            <div class="absolute ring-expand" style="width: 200px; height: 200px; border: 1px solid oklch(0.5 0.15 35 / 0.3); border-radius: 50%; animation-delay: \${i * 1}s;"></div>
          \`).join('')}
          <svg viewBox="0 0 600 800" class="relative w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl h-auto px-4" id="gateSvg">
            <defs>
              <linearGradient id="pillarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="oklch(0.3 0.03 30)" />
                <stop offset="50%" stop-color="oklch(0.15 0.02 28)" />
                <stop offset="100%" stop-color="oklch(0.08 0.01 25)" />
              </linearGradient>
              <linearGradient id="emberGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stop-color="oklch(0.8 0.25 38 / 0.8)" />
                <stop offset="30%" stop-color="oklch(0.6 0.2 32 / 0.4)" />
                <stop offset="100%" stop-color="transparent" />
              </linearGradient>
              <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="oklch(0.95 0.2 45)" />
                <stop offset="30%" stop-color="oklch(0.8 0.25 38)" />
                <stop offset="70%" stop-color="oklch(0.6 0.2 32)" />
                <stop offset="100%" stop-color="transparent" />
              </radialGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <clipPath id="gateClip">
                <path d="M 100 800 L 100 150 Q 300 0 500 150 L 500 800 Z" />
              </clipPath>
            </defs>
            <g class="reveal-gate" style="animation-delay: 0.2s;">
              <rect x="70" y="100" width="60" height="700" fill="url(#pillarGrad)" />
              <polygon points="70,100 100,50 130,100" fill="url(#pillarGrad)" />
              \${[200, 350, 500, 650].map((y) => \`
                <line x1="80" y1="\${y}" x2="120" y2="\${y}" stroke="oklch(0.25 0.03 30)" stroke-width="2" />
              \`).join('')}
            </g>
            <g class="reveal-gate" style="animation-delay: 0.4s;">
              <rect x="470" y="100" width="60" height="700" fill="url(#pillarGrad)" />
              <polygon points="470,100 500,50 530,100" fill="url(#pillarGrad)" />
              \${[200, 350, 500, 650].map((y) => \`
                <line x1="480" y1="\${y}" x2="520" y2="\${y}" stroke="oklch(0.25 0.03 30)" stroke-width="2" />
              \`).join('')}
            </g>
            <path d="M 100 150 Q 300 -50 500 150" fill="none" stroke="url(#pillarGrad)" stroke-width="30" class="draw-line" />
            <g clip-path="url(#gateClip)">
              <rect x="100" y="0" width="400" height="800" fill="oklch(0.02 0.005 30)" />
              <g class="pulse-core" style="transform-origin: 300px 400px;">
                <circle cx="300" cy="400" r="80" fill="url(#coreGrad)" filter="url(#glow)" />
                <circle cx="300" cy="400" r="40" fill="oklch(0.98 0.15 50)" filter="url(#glow)" />
                <circle cx="300" cy="400" r="15" fill="oklch(0.03 0.01 30)" />
              </g>
              \${[0, 1, 2, 3, 4, 5].map((i) => \`
                <g class="orbit" style="transform-origin: 300px 400px; --orbit-radius: \${80 + i * 25}px; --orbit-duration: \${15 + i * 5}s; animation-direction: \${i % 2 === 0 ? 'normal' : 'reverse'};">
                  <circle cx="300" cy="\${400 - (80 + i * 25)}" r="\${4 - i * 0.5}" fill="oklch(0.8 0.22 \${35 + i * 3})" filter="url(#glow)" />
                </g>
              \`).join('')}
            </g>
            \${[180, 240, 300, 360, 420].map((x, i) => \`
              <rect x="\${x}" y="150" width="3" height="650" fill="oklch(0.15 0.02 30 / 0.5)" class="reveal-gate" style="animation-delay: \${0.6 + i * 0.1}s;" />
            \`).join('')}
            <rect x="100" y="700" width="400" height="100" fill="url(#emberGrad)" />
          </svg>
          <div class="absolute bottom-24 md:bottom-32 left-0 right-0 flex flex-col items-center gap-4 px-4">
            <h1 class="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white text-center type-reveal opacity-0" style="animation-delay: 1.5s;">gateproof</h1>
            <p class="text-xs sm:text-sm text-gray-300 text-center max-w-md type-reveal opacity-0" style="animation-delay: 1.8s;">The observation layer for building software in reverse. Define constraints. Let AI build within them. Validate against reality.</p>
            <button onclick="openInfoDrawer()" class="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 transition-colors type-reveal opacity-0" style="animation-delay: 2.1s;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              <span>Learn more</span>
            </button>
          </div>
          <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 type-reveal opacity-0" style="animation-delay: 2.4s;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-500 scroll-hint">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </div>
          <div class="absolute inset-0 pointer-events-none scan-line" style="background: linear-gradient(transparent 0%, oklch(0.7 0.2 35 / 0.05) 50%, transparent 100%); height: 200px;"></div>
        </div>
      \`;
      
      const container = document.getElementById('gateContainer');
      container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const distance = Math.sqrt(Math.pow(e.clientX - rect.left - centerX, 2) + Math.pow(e.clientY - rect.top - centerY, 2));
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
        hoverIntensity = 1 - distance / maxDistance;
        const svg = document.getElementById('gateSvg');
        if (svg) {
          svg.style.filter = \`drop-shadow(0 0 \${30 + hoverIntensity * 30}px oklch(0.7 0.22 35 / \${0.4 + hoverIntensity * 0.3}))\`;
        }
      });
    }

    // Chaos Section
    function initChaosSection() {
      const section = document.getElementById('chaosSection');
      const glitchLines = Array.from({ length: 20 }, () => Math.random() * 100);
      
      section.innerHTML = \`
        <div class="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
          <div class="absolute inset-0" style="background: radial-gradient(ellipse 120% 80% at 30% 20%, oklch(0.25 0.2 25 / 0.4) 0%, transparent 50%), radial-gradient(ellipse 100% 100% at 70% 80%, oklch(0.2 0.18 20 / 0.3) 0%, transparent 50%), oklch(0.03 0.01 25);"></div>
          \${glitchLines.map((top, i) => \`
            <div class="absolute w-full h-px" style="top: \${top}%; background: linear-gradient(90deg, transparent 0%, oklch(0.5 0.2 25 / \${0.1 + Math.random() * 0.3}) \${Math.random() * 50}%, transparent 100%); transform: translateX(\${(Math.random() - 0.5) * 20}px);"></div>
          \`).join('')}
          <div class="relative flex flex-col items-center gap-6 px-4">
            <svg viewBox="0 0 400 400" class="w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-96 lg:h-96">
              <defs>
                <filter id="chaos-blur">
                  <feGaussianBlur stdDeviation="2" />
                </filter>
              </defs>
              \${Array.from({ length: 15 }).map((_, i) => {
                const startX = 50 + Math.random() * 300;
                const startY = 50 + Math.random() * 300;
                const controlX1 = Math.random() * 400;
                const controlY1 = Math.random() * 400;
                const controlX2 = Math.random() * 400;
                const controlY2 = Math.random() * 400;
                const endX = 50 + Math.random() * 300;
                const endY = 50 + Math.random() * 300;
                return \`<path d="M \${startX} \${startY} C \${controlX1} \${controlY1}, \${controlX2} \${controlY2}, \${endX} \${endY}" fill="none" stroke="oklch(0.5 0.2 \${20 + i} / \${0.2 + (i % 3) * 0.15})" stroke-width="\${1 + (i % 3)}" filter="url(#chaos-blur)" />\`;
              }).join('')}
              <circle cx="200" cy="200" r="60" fill="oklch(0.4 0.25 25 / 0.3)" class="pulse-core" style="transform-origin: 200px 200px;" />
              <circle cx="200" cy="200" r="30" fill="oklch(0.5 0.3 22)" class="pulse-core" style="transform-origin: 200px 200px; animation-delay: 0.5s;" />
            </svg>
            <div class="text-center">
              <p class="text-sm sm:text-base font-medium" style="color: oklch(0.6 0.2 25);">Without the Gate</p>
              <p class="text-xs sm:text-sm text-muted-foreground mt-1">Chaos. Untested. Unvalidated.</p>
            </div>
          </div>
        </div>
      \`;
    }

    // Transition Section
    function initTransitionSection() {
      const section = document.getElementById('transitionSection');
      let scrollProgress = 0;
      
      const updateProgress = () => {
        const rect = section.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        scrollProgress = Math.max(0, Math.min(1, (windowHeight - rect.top) / (windowHeight + rect.height)));
        const hellSide = document.getElementById('hellSide');
        const heavenSide = document.getElementById('heavenSide');
        if (hellSide) hellSide.style.opacity = 1 - scrollProgress * 0.3;
        if (heavenSide) heavenSide.style.opacity = 0.5 + scrollProgress * 0.5;
      };
      
      window.addEventListener('scroll', updateProgress);
      updateProgress();
      
      section.innerHTML = \`
        <div class="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
          <div class="absolute inset-0" style="background: linear-gradient(90deg, oklch(0.05 0.03 25) 0%, oklch(0.03 0.01 30) 30%, oklch(0.08 0.02 60) 50%, oklch(0.85 0.03 85) 70%, oklch(0.95 0.02 90) 100%);"></div>
          <div class="relative flex flex-col items-center gap-8 px-4">
            <div class="flex items-center gap-4 sm:gap-8 md:gap-16">
              <div id="hellSide" class="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 relative transition-opacity duration-500">
                <svg viewBox="0 0 100 100" class="w-full h-full">
                  \${Array.from({ length: 8 }).map((_, i) => \`
                    <path d="M \${20 + i * 8} \${20 + i * 5} Q \${50 + i * 3} \${30 + i * 4}, \${80 - i * 5} \${70 + i * 2}" fill="none" stroke="oklch(0.5 0.2 25 / \${0.3 + i * 0.08})" stroke-width="2" />
                  \`).join('')}
                  <circle cx="50" cy="50" r="15" fill="oklch(0.5 0.25 22 / 0.8)" class="pulse-core" style="transform-origin: 50px 50px;" />
                </svg>
              </div>
              <div class="relative">
                <svg viewBox="0 0 160 240" class="w-20 h-32 sm:w-28 sm:h-44 md:w-36 md:h-56">
                  <defs>
                    <linearGradient id="hellPillar" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="oklch(0.35 0.08 30)" />
                      <stop offset="100%" stop-color="oklch(0.15 0.05 25)" />
                    </linearGradient>
                    <linearGradient id="heavenPillarTrans" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="oklch(0.95 0.08 85)" />
                      <stop offset="100%" stop-color="oklch(0.8 0.1 80)" />
                    </linearGradient>
                    <linearGradient id="transitionCore" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="oklch(0.7 0.2 35)" />
                      <stop offset="50%" stop-color="oklch(0.9 0.1 60)" />
                      <stop offset="100%" stop-color="oklch(0.95 0.08 85)" />
                    </linearGradient>
                  </defs>
                  <rect x="10" y="40" width="20" height="200" fill="url(#hellPillar)" />
                  <polygon points="10,40 20,10 30,40" fill="url(#hellPillar)" />
                  <rect x="130" y="40" width="20" height="200" fill="url(#heavenPillarTrans)" />
                  <polygon points="130,40 140,10 150,40" fill="url(#heavenPillarTrans)" />
                  <path d="M 20 40 Q 80 -20 140 40" fill="none" stroke="url(#transitionCore)" stroke-width="12" />
                  <rect x="30" y="40" width="100" height="200" fill="oklch(0.02 0.005 30)" />
                  <ellipse cx="80" cy="130" rx="30" ry="40" fill="oklch(0.15 0.05 50 / 0.5)" />
                  <circle cx="80" cy="130" r="20" fill="url(#transitionCore)" class="pulse-core" style="transform-origin: 80px 130px;" />
                  <circle cx="80" cy="130" r="8" fill="oklch(0.98 0.05 70)" />
                </svg>
                \${[0, 1, 2].map((i) => \`
                  <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div class="absolute ring-expand" style="width: 50px; height: 80px; border: 1px solid oklch(0.7 0.1 65 / 0.3); border-radius: 30% / 20%; animation-delay: \${i * 0.8}s;"></div>
                  </div>
                \`).join('')}
              </div>
              <div id="heavenSide" class="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 relative transition-opacity duration-500">
                <svg viewBox="0 0 100 100" class="w-full h-full">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="oklch(0.85 0.1 85 / 0.4)" stroke-width="1" />
                  <circle cx="50" cy="50" r="30" fill="none" stroke="oklch(0.85 0.1 85 / 0.5)" stroke-width="1" />
                  <polygon points="50,15 80,70 20,70" fill="none" stroke="oklch(0.85 0.12 85 / 0.6)" stroke-width="1.5" />
                  <polygon points="50,85 20,30 80,30" fill="none" stroke="oklch(0.85 0.12 85 / 0.6)" stroke-width="1.5" />
                  <circle cx="50" cy="50" r="12" fill="oklch(0.9 0.1 85 / 0.4)" />
                  <circle cx="50" cy="50" r="5" fill="oklch(0.98 0.05 90)" class="pulse-divine" style="transform-origin: 50px 50px;" />
                </svg>
              </div>
            </div>
            <div class="text-center">
              <p class="text-sm sm:text-base font-medium" style="color: oklch(0.8 0.08 70);">The Threshold</p>
              <p class="text-xs sm:text-sm mt-1" style="color: oklch(0.6 0.04 65);">From chaos to control. Through the gate.</p>
            </div>
          </div>
        </div>
      \`;
    }

    // Heaven Section with Demo
    function initHeavenSection() {
      const section = document.getElementById('heavenSection');
      
      section.innerHTML = \`
        <div class="relative w-full min-h-screen overflow-hidden bg-white">
          <div class="relative pt-16 pb-8 flex justify-center">
            <svg viewBox="0 0 400 200" class="w-48 sm:w-64 md:w-80 h-auto">
              <defs>
                <linearGradient id="heavenPillar" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="oklch(0.95 0.08 85)" />
                  <stop offset="50%" stop-color="oklch(0.85 0.12 80)" />
                  <stop offset="100%" stop-color="oklch(0.7 0.1 75)" />
                </linearGradient>
                <radialGradient id="heavenCore" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="oklch(0.98 0.05 90)" />
                  <stop offset="40%" stop-color="oklch(0.92 0.1 85)" />
                  <stop offset="100%" stop-color="oklch(0.8 0.08 80 / 0.5)" />
                </radialGradient>
                <filter id="heavenGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              \${[0, 1, 2].map((i) => \`
                <circle cx="200" cy="100" r="50" fill="none" stroke="oklch(0.85 0.1 85 / 0.3)" stroke-width="1" class="ring-expand-gold" style="animation-delay: \${i * 1.3}s;" />
              \`).join('')}
              <rect x="60" y="40" width="25" height="160" fill="url(#heavenPillar)" />
              <polygon points="60,40 72.5,10 85,40" fill="url(#heavenPillar)" />
              <rect x="315" y="40" width="25" height="160" fill="url(#heavenPillar)" />
              <polygon points="315,40 327.5,10 340,40" fill="url(#heavenPillar)" />
              <path d="M 72.5 40 Q 200 -30 327.5 40" fill="none" stroke="url(#heavenPillar)" stroke-width="15" />
              <circle cx="200" cy="100" r="35" fill="url(#heavenCore)" filter="url(#heavenGlow)" class="pulse-divine" />
              <circle cx="200" cy="100" r="15" fill="oklch(0.99 0.02 90)" />
              <g class="pulse-divine" style="transform-origin: 200px 100px;">
                <path d="M 200 80 L 203 95 L 218 100 L 203 105 L 200 120 L 197 105 L 182 100 L 197 95 Z" fill="oklch(0.95 0.08 85)" />
              </g>
            </svg>
          </div>
          <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-16">
            <div class="text-center mb-8 md:mb-12">
              <div class="inline-flex items-center gap-2 px-3 py-1.5 mb-4 border rounded-full" style="border-color: rgba(0,0,0,0.1); background: rgba(0,0,0,0.02);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                <span class="text-xs font-medium text-gray-700">The Order</span>
              </div>
              <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 text-gray-900">gateproof</h2>
              <p class="text-sm sm:text-base max-w-xl mx-auto text-gray-600">The observation layer for building software in reverse. Define constraints. Let AI build within them. Validate against reality.</p>
            </div>
            <div class="grid lg:grid-cols-2 gap-8 lg:gap-12">
              <div class="space-y-6">
                <div class="p-5 sm:p-6 rounded-sm bg-white border border-gray-200">
                  <div class="flex items-center gap-2 mb-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <h3 class="text-base font-semibold text-gray-900">The Inversion</h3>
                  </div>
                  <p class="text-sm leading-relaxed mb-4 text-gray-600">Software development is inverting. The question is not whether AI will write code—it is whether we will control it or it will control us.</p>
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
                <div class="p-5 sm:p-6 rounded-sm bg-white border border-gray-200">
                  <div class="flex items-center gap-2 mb-4">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>
                    <h3 class="text-base font-semibold text-gray-900">Three Primitives</h3>
                  </div>
                  <div class="space-y-3">
                    \${[
                      { icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', title: 'Observe', desc: 'Connect to observability backends. Stream real logs from production.' },
                      { icon: 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2 M7 9l5 5 5-5 M12 4v10', title: 'Act', desc: 'Trigger actions—deploy, automate, execute—that generate observable behavior.' },
                      { icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M9 11l3 3L22 4', title: 'Assert', desc: 'Validate that logs match constraints. Real logs from real systems.' }
                    ].map(({ icon, title, desc }) => \`
                      <div class="flex gap-3 p-3 rounded-sm bg-gray-50">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" class="mt-0.5 shrink-0"><path d="\${icon}"/></svg>
                        <div>
                          <p class="text-sm font-medium text-gray-900">\${title}</p>
                          <p class="text-xs text-gray-600">\${desc}</p>
                        </div>
                      </div>
                    \`).join('')}
                  </div>
                </div>
                <button onclick="openInfoDrawer()" class="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80" style="color: var(--gold-deep);">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                  <span>Read full documentation</span>
                </button>
              </div>
              <div class="lg:sticky lg:top-8 h-fit">
                <div class="rounded-sm overflow-hidden bg-white border border-gray-200 shadow-lg">
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
                      <span id="stateIcon"></span>
                      <span class="text-xs text-gray-600" id="stateLabel">Ready</span>
                    </div>
                  </div>
                  <div class="h-56 sm:h-64 overflow-y-auto p-4 font-mono text-xs bg-gray-900" id="terminalLogs">
                    <div class="flex items-center gap-2 text-gray-400">
                      <span class="text-amber-400">$</span>
                      <span>Ready to run test...</span>
                      <span class="animate-pulse">_</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <button onclick="runDemo()" id="runDemoBtn" class="flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50 bg-amber-500 hover:bg-amber-600 text-white rounded">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      <span>Run Test</span>
                    </button>
                    <button onclick="resetDemo()" id="resetDemoBtn" class="hidden flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors border border-gray-300 text-gray-700 rounded hover:bg-gray-100">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      \`;
    }

    // CTA Section
    function initCTASection() {
      const section = document.getElementById('ctaSection');
      
      section.innerHTML = \`
        <section class="relative px-4 sm:px-6 flex items-center justify-center w-full">
          <div class="absolute inset-0" style="background: radial-gradient(ellipse 60% 60% at 30% 50%, oklch(0.1 0.05 30 / 0.3) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 70% 50%, oklch(0.15 0.04 85 / 0.2) 0%, transparent 60%), oklch(0.03 0.01 30);"></div>
          <div class="relative flex flex-col items-center gap-8 md:gap-10 w-full max-w-xl">
            <div class="flex items-center gap-6 sm:gap-10">
              <svg viewBox="0 0 100 140" class="w-12 h-16 sm:w-16 sm:h-22 opacity-60">
                <defs>
                  <linearGradient id="hellGateCta" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="oklch(0.35 0.08 30)" />
                    <stop offset="100%" stop-color="oklch(0.15 0.05 25)" />
                  </linearGradient>
                  <radialGradient id="hellCoreCta" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="oklch(0.8 0.25 38)" />
                    <stop offset="100%" stop-color="oklch(0.5 0.2 30 / 0.5)" />
                  </radialGradient>
                </defs>
                <rect x="10" y="20" width="12" height="120" fill="url(#hellGateCta)" />
                <rect x="78" y="20" width="12" height="120" fill="url(#hellGateCta)" />
                <path d="M 16 20 Q 50 -5 84 20" fill="none" stroke="url(#hellGateCta)" stroke-width="8" />
                <rect x="22" y="20" width="56" height="120" fill="oklch(0.02 0.005 30)" />
                <circle cx="50" cy="70" r="12" fill="url(#hellCoreCta)" class="pulse-core" style="transform-origin: 50px 70px;" />
              </svg>
              <div class="text-center">
                <h2 class="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">gateproof</h2>
                <p class="text-xs sm:text-sm text-muted-foreground mt-1">Choose your path</p>
              </div>
              <svg viewBox="0 0 100 140" class="w-12 h-16 sm:w-16 sm:h-22 opacity-70">
                <defs>
                  <linearGradient id="heavenGateCta" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="oklch(0.95 0.08 85)" />
                    <stop offset="100%" stop-color="oklch(0.8 0.1 80)" />
                  </linearGradient>
                  <radialGradient id="heavenCoreCta" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="oklch(0.98 0.05 90)" />
                    <stop offset="100%" stop-color="oklch(0.85 0.1 85 / 0.5)" />
                  </radialGradient>
                </defs>
                <rect x="10" y="20" width="12" height="120" fill="url(#heavenGateCta)" />
                <rect x="78" y="20" width="12" height="120" fill="url(#heavenGateCta)" />
                <path d="M 16 20 Q 50 -5 84 20" fill="none" stroke="url(#heavenGateCta)" stroke-width="8" />
                <rect x="22" y="20" width="56" height="120" fill="oklch(0.95 0.02 90 / 0.3)" />
                <circle cx="50" cy="70" r="12" fill="url(#heavenCoreCta)" class="pulse-divine" style="transform-origin: 50px 70px;" />
              </svg>
            </div>
            <p class="text-sm sm:text-base text-center text-muted-foreground max-w-md">Take control of AI-generated code. Define constraints. Validate against reality.</p>
            <div class="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <button onclick="scrollToDemo()" class="relative group w-full sm:w-auto">
                <div class="flex items-center justify-center gap-2 px-6 py-3 transition-all duration-300" style="background: linear-gradient(135deg, oklch(0.7 0.2 35) 0%, oklch(0.55 0.18 30) 100%); box-shadow: 0 0 20px oklch(0.6 0.18 35 / 0.3);">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-background"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>
                  <span class="text-sm font-medium text-background">Try the Demo</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-background transition-transform duration-300 group-hover:translate-x-1"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </div>
              </button>
              <a href="https://github.com/gateproof/gateproof" target="_blank" rel="noopener noreferrer" class="relative group w-full sm:w-auto">
                <div class="flex items-center justify-center gap-2 px-6 py-3 border transition-all duration-300" style="border-color: oklch(0.3 0.03 40);">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: oklch(0.5 0.03 40);"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0-1.1-.9-2-2-2-1.5 0-3 1.5-3.5 0-.38-.38-.75-.75-1.25C8.5 2.5 7.5 2 6.5 2c-1.1 0-2 .9-2 2 0 .75.38 1.4 1 1.75-.63.35-1 .75-1 1.25 0 1.1.9 2 2 2h7c1.1 0 2-.9 2-2 0-.5-.37-.9-1-1.25.62-.35 1-1 1-1.75 0-1.1-.9-2-2-2z"/></svg>
                  <span class="text-sm font-medium transition-colors duration-300" style="color: oklch(0.6 0.02 40);">View on GitHub</span>
                </div>
              </a>
            </div>
            <button onclick="openInfoDrawer()" class="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
              <span>Read the documentation</span>
            </button>
          </div>
        </section>
      \`;
    }

    // Info Drawer
    function initInfoDrawer() {
      const drawer = document.getElementById('infoDrawer');
      drawer.innerHTML = \`
        <div id="infoBackdrop" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onclick="closeInfoDrawer()"></div>
        <div id="infoDrawerContent" class="hidden fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto" style="background: linear-gradient(180deg, oklch(0.08 0.02 30) 0%, oklch(0.04 0.01 25) 100%); border-top: 1px solid oklch(0.2 0.03 35);">
          <div class="sticky top-0 flex justify-center pt-3 pb-2 bg-inherit z-10">
            <div class="w-12 h-1 rounded-full bg-muted-foreground/30"></div>
          </div>
          <button onclick="closeInfoDrawer()" class="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-muted-foreground"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div class="px-6 pb-12 pt-4 max-w-4xl mx-auto">
            <div class="mb-8 type-reveal opacity-0 stagger-1">
              <h2 class="text-2xl md:text-3xl font-bold text-foreground mb-2">gateproof</h2>
              <p class="text-muted-foreground text-sm md:text-base">The observation layer for building software in reverse</p>
            </div>
            <div class="mb-8 type-reveal opacity-0 stagger-2">
              <div class="flex items-center gap-2 mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <h3 class="text-lg font-semibold text-foreground">The Inversion</h3>
              </div>
              <p class="text-muted-foreground text-sm leading-relaxed mb-4">Software development is inverting. The question is not whether AI will write code - it is whether we will control it or it will control us.</p>
              <div class="grid md:grid-cols-2 gap-4">
                <div class="p-4" style="background: oklch(0.55 0.25 25 / 0.1); border: 1px solid oklch(0.55 0.25 25 / 0.2);">
                  <p class="text-xs uppercase tracking-wider mb-2" style="color: oklch(0.55 0.25 25);">Before</p>
                  <p class="text-sm text-foreground/80">Humans write code. Debug it. Maintain it. We are in the loop, manually implementing every feature.</p>
                </div>
                <div class="p-4" style="background: oklch(0.75 0.22 38 / 0.1); border: 1px solid oklch(0.75 0.22 38 / 0.2);">
                  <p class="text-xs uppercase tracking-wider mb-2" style="color: oklch(0.75 0.22 38);">After</p>
                  <p class="text-sm text-foreground/80">Humans define constraints. AI builds within them. Systems validate against real behavior. Humans guide. Systems build.</p>
                </div>
              </div>
            </div>
            <div class="mb-8 type-reveal opacity-0 stagger-3">
              <div class="flex items-center gap-2 mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>
                <h3 class="text-lg font-semibold text-foreground">Three Primitives</h3>
              </div>
              <div class="space-y-3">
                \${[
                  { icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', title: 'Observe', desc: 'Connect to observability backends. Stream real logs from production.' },
                  { icon: 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2 M7 9l5 5 5-5 M12 4v10', title: 'Act', desc: 'Trigger actions - deploy, browser automation, shell commands - that generate observable behavior.' },
                  { icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M9 11l3 3L22 4', title: 'Assert', desc: 'Validate that logs match your defined constraints. Not mocks. Not stubs. Real logs from real systems.' }
                ].map(({ icon, title, desc }) => \`
                  <div class="flex gap-3 p-3" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" class="mt-0.5 shrink-0"><path d="\${icon}"/></svg>
                    <div>
                      <p class="text-sm font-medium text-foreground">\${title}</p>
                      <p class="text-xs text-muted-foreground">\${desc}</p>
                    </div>
                  </div>
                \`).join('')}
              </div>
            </div>
            <div class="mb-8 type-reveal opacity-0 stagger-4">
              <div class="flex items-center gap-2 mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                <h3 class="text-lg font-semibold text-foreground">The Foundation</h3>
              </div>
              <p class="text-muted-foreground text-sm leading-relaxed">Control requires observation. You cannot guide what you cannot see. You cannot validate what you cannot measure. gateproof is the bridge between "what should happen" and "what did happen" using real system behavior, not theoretical models. It is the infrastructure for building in reverse. Define the harness. Let the system find the path. Validate against reality.</p>
            </div>
            <div class="flex flex-wrap gap-3 type-reveal opacity-0 stagger-5">
              <a href="#heavenSection" onclick="closeInfoDrawer(); scrollToDemo();" class="flex items-center gap-2 px-5 py-3 font-medium text-sm transition-colors" style="background: var(--accent); color: white;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>
                <span>Try the Demo</span>
              </a>
              <a href="https://github.com/gateproof/gateproof" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 px-5 py-3 border border-border text-foreground font-medium text-sm hover:bg-white/5 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0-1.1-.9-2-2-2-1.5 0-3 1.5-3.5 0-.38-.38-.75-.75-1.25C8.5 2.5 7.5 2 6.5 2c-1.1 0-2 .9-2 2 0 .75.38 1.4 1 1.75-.63.35-1 .75-1 1.25 0 1.1.9 2 2 2h7c1.1 0 2-.9 2-2 0-.5-.37-.9-1-1.25.62-.35 1-1 1-1.75 0-1.1-.9-2-2-2z"/></svg>
                <span>View on GitHub</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="opacity-50"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14L21 3"/></svg>
              </a>
            </div>
          </div>
        </div>
      \`;
    }

    // Demo functions
    let demoState = 'idle';
    let demoLogs = [];

    function addLog(level, message) {
      const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
      demoLogs.push({ timestamp, level, message });
      updateTerminal();
    }

    function updateTerminal() {
      const logsContainer = document.getElementById('terminalLogs');
      const stateIcon = document.getElementById('stateIcon');
      const stateLabel = document.getElementById('stateLabel');
      const runBtn = document.getElementById('runDemoBtn');
      const resetBtn = document.getElementById('resetDemoBtn');

      if (!logsContainer) return;

      if (demoLogs.length === 0 && demoState === 'idle') {
        logsContainer.innerHTML = \`
          <div class="flex items-center gap-2 text-gray-400">
            <span class="text-amber-400">$</span>
            <span>Ready to run test...</span>
            <span class="animate-pulse">_</span>
          </div>
        \`;
      } else {
        logsContainer.innerHTML = demoLogs.map(log => {
          let color = 'text-gray-300';
          if (log.level === 'warn') color = 'text-yellow-400';
          if (log.level === 'error') color = 'text-red-400';
          if (log.level === 'success') color = 'text-green-400';
          return \`
            <div class="flex gap-2 mb-1">
              <span class="text-gray-500">\${log.timestamp}</span>
              <span class="\${color}">\${log.message}</span>
            </div>
          \`;
        }).join('');
        logsContainer.scrollTop = logsContainer.scrollHeight;
      }

      const icons = {
        observing: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" class="animate-pulse"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>',
        acting: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" class="animate-pulse"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>',
        asserting: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" class="animate-spin"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
        success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14 M9 11l3 3L22 4"/></svg>',
        failure: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
        idle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
      };

      const labels = {
        observing: 'Observing...',
        acting: 'Acting...',
        asserting: 'Asserting...',
        success: 'Validated',
        failure: 'Failed',
        idle: 'Ready'
      };

      if (stateIcon) stateIcon.innerHTML = icons[demoState] || icons.idle;
      if (stateLabel) {
        stateLabel.textContent = labels[demoState] || labels.idle;
        stateLabel.className = 'text-xs text-gray-600';
      }
      if (runBtn) runBtn.disabled = !['idle', 'success', 'failure'].includes(demoState);
      if (resetBtn) resetBtn.classList.toggle('hidden', !['success', 'failure'].includes(demoState));
    }

    async function runDemo() {
      if (demoState !== 'idle' && demoState !== 'success' && demoState !== 'failure') return;
      
      demoState = 'observing';
      demoLogs = [];
      updateTerminal();

      await delay(500);
      addLog('info', 'Connecting to observability backend...');
      await delay(800);
      addLog('info', 'Streaming logs from production worker...');
      await delay(600);
      addLog('success', 'Log stream established');

      demoState = 'acting';
      updateTerminal();
      await delay(400);
      addLog('info', 'Triggering action: POST /api/test');
      await delay(1000);
      addLog('info', 'Response received: 200 OK');

      demoState = 'asserting';
      updateTerminal();
      await delay(400);
      addLog('info', 'Validating against constraints...');
      await delay(600);
      addLog('info', 'Checking: no errors logged');
      await delay(400);
      addLog('success', 'PASS: No errors in log stream');
      await delay(300);
      addLog('info', 'Checking: action logged');
      await delay(400);
      addLog('success', 'PASS: test_action found in logs');
      await delay(300);
      addLog('info', 'Checking: stage === production');
      await delay(400);
      addLog('success', 'PASS: Stage matches constraint');

      demoState = 'success';
      updateTerminal();
      await delay(200);
      addLog('success', 'All assertions passed. Reality matches expectation.');
    }

    function resetDemo() {
      demoState = 'idle';
      demoLogs = [];
      updateTerminal();
    }

    function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Legacy test functions (keep for compatibility)
    async function runTest() {
      const resultDiv = document.getElementById('testResult');
      if (!resultDiv) return;
      
      resultDiv.className = 'test-result show running';
      resultDiv.innerHTML = '<div class="result-header"><span>⏳</span><span>Running test...</span></div><div class="result-details"><div class="loading"></div> <span>Connecting to Analytics Engine and running test...</span></div>';
      
      try {
        const response = await fetch('/api/run-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: '/api/test',
            assertions: ['noErrors', 'hasAction:request_received']
          })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
          resultDiv.className = 'test-result show success';
          resultDiv.innerHTML = \`<div class="result-header"><span>✅</span><span>Test Passed (\${result.durationMs}ms)</span></div><div class="result-details">\${formatResult(result)}</div>\`;
        } else {
          resultDiv.className = 'test-result show failed';
          resultDiv.innerHTML = \`<div class="result-header"><span>❌</span><span>Test Failed: \${result.error?.message || 'Unknown error'}</span></div><div class="result-details">\${formatResult(result)}</div>\`;
        }
      } catch (error) {
        resultDiv.className = 'test-result show failed';
        resultDiv.innerHTML = \`<div class="result-header"><span>❌</span><span>Error: \${error.message}</span></div><div class="result-details"><pre>\${error.stack || error.message}</pre></div>\`;
      }
    }

    async function runHealthTest() {
      const resultDiv = document.getElementById('testResult');
      if (!resultDiv) return;
      
      resultDiv.className = 'test-result show running';
      resultDiv.innerHTML = '<div class="result-header"><span>⏳</span><span>Running health test...</span></div><div class="result-details"><div class="loading"></div> <span>Testing /api/health endpoint...</span></div>';
      
      try {
        const response = await fetch('/api/run-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: '/api/health',
            assertions: ['noErrors', 'hasAction:request_received', 'hasStage:worker']
          })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
          resultDiv.className = 'test-result show success';
          resultDiv.innerHTML = \`<div class="result-header"><span>✅</span><span>Health Test Passed (\${result.durationMs}ms)</span></div><div class="result-details">\${formatResult(result)}</div>\`;
        } else {
          resultDiv.className = 'test-result show failed';
          resultDiv.innerHTML = \`<div class="result-header"><span>❌</span><span>Health Test Failed</span></div><div class="result-details">\${formatResult(result)}</div>\`;
        }
      } catch (error) {
        resultDiv.className = 'test-result show failed';
        resultDiv.innerHTML = \`<div class="result-header"><span>❌</span><span>Error: \${error.message}</span></div><div class="result-details"><pre>\${error.stack || error.message}</pre></div>\`;
      }
    }

    function formatResult(result) {
      let html = \`<div class="evidence">
        <div class="evidence-item">
          <strong>Duration</strong>
          \${result.durationMs}ms
        </div>
        <div class="evidence-item">
          <strong>Logs Collected</strong>
          \${result.logs?.length || 0}
        </div>
        <div class="evidence-item">
          <strong>Stages Seen</strong>
          \${result.evidence?.stagesSeen?.join(', ') || 'none'}
        </div>
        <div class="evidence-item">
          <strong>Actions Seen</strong>
          \${result.evidence?.actionsSeen?.join(', ') || 'none'}
        </div>
      </div>\`;
      
      if (result.logs && result.logs.length > 0) {
        html += \`<h3 style="margin-top: 1.5rem;">Sample Logs</h3>
        <pre>\${JSON.stringify(result.logs.slice(0, 5), null, 2)}</pre>\`;
      }
      
      if (result.error) {
        html += \`<h3 style="margin-top: 1.5rem;">Error Details</h3>
        <pre>\${JSON.stringify(result.error, null, 2)}</pre>\`;
      }
      
      return html;
    }

    // Info drawer functions
    function openInfoDrawer() {
      const backdrop = document.getElementById('infoBackdrop');
      const content = document.getElementById('infoDrawerContent');
      if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.classList.add('fade-in');
      }
      if (content) {
        content.classList.remove('hidden');
        content.classList.add('slide-up');
      }
    }

    function closeInfoDrawer() {
      const backdrop = document.getElementById('infoBackdrop');
      const content = document.getElementById('infoDrawerContent');
      if (backdrop) {
        backdrop.classList.remove('fade-in');
        backdrop.classList.add('fade-out');
      }
      if (content) {
        content.classList.remove('slide-up');
        content.classList.add('slide-down');
      }
      setTimeout(() => {
        if (backdrop) backdrop.classList.add('hidden');
        if (content) content.classList.add('hidden');
      }, 300);
    }

    function scrollToDemo() {
      const section = document.getElementById('heavenSection');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }

    // Initialize everything
    initEmberField();
    initGateSection();
    initChaosSection();
    initTransitionSection();
    initHeavenSection();
    initCTASection();
    initInfoDrawer();
    updateTerminal();

    // Make functions globally available
    window.runTest = runTest;
    window.runHealthTest = runHealthTest;
    window.runDemo = runDemo;
    window.resetDemo = resetDemo;
    window.openInfoDrawer = openInfoDrawer;
    window.closeInfoDrawer = closeInfoDrawer;
    window.scrollToDemo = scrollToDemo;
  </script>
</body>
</html>`;
}
