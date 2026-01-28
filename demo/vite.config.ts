import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "cloudflare:workers": resolve("./scripts/cloudflare-workers-stub.js")
    }
  },
  plugins: [tailwindcss(), sveltekit()],
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/.alchemy/**']
    }
  },
  build: {
    rollupOptions: {
      external: ['playwright']
    }
  }
});
