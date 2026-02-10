import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

/**
 * Strip `containers` from the alchemy-generated wrangler.jsonc so that
 * wrangler's getPlatformProxy() doesn't assert on a missing build ID.
 * Containers can't run locally anyway.
 */
function stripContainersFromWrangler(): Plugin {
  return {
    name: "strip-wrangler-containers",
    configureServer() {
      const cfgPath = resolve(".alchemy/local/wrangler.jsonc");
      try {
        const raw = readFileSync(cfgPath, "utf-8");
        const json = JSON.parse(raw);
        if (json.containers) {
          delete json.containers;
          writeFileSync(cfgPath, JSON.stringify(json, null, 2) + "\n");
        }
      } catch {}
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      "cloudflare:workers": resolve("./scripts/cloudflare-workers-stub.js"),
      "$docs": resolve("./docs")
    }
  },
  plugins: [stripContainersFromWrangler(), tailwindcss(), sveltekit()],
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: ['..']
    },
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
