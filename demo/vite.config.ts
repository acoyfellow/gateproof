import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
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
