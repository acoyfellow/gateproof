import alchemy from "alchemy";
import { Container, SvelteKit } from "alchemy/cloudflare";
import { CloudflareStateStore } from "alchemy/state";
import { readFileSync } from "fs";
import { join } from "path";

// Load .env file manually to ensure env vars are available
try {
  const envPath = join(process.cwd(), "..", ".env");
  const envContent = readFileSync(envPath, "utf-8");
  const envLines = envContent.split("\n");
  for (const line of envLines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
} catch (error) {
  console.warn("Could not load .env file:", error);
}

const app = await alchemy("gateproof-demo", {
  password: process.env.ALCHEMY_PASSWORD ?? "",
  stateStore: (scope) =>
    new CloudflareStateStore(scope, {
      stateToken: alchemy.secret(process.env.ALCHEMY_STATE_TOKEN!),
    }),
});

const sandboxContainer = await Container("sandbox", {
  className: "Sandbox",
  build: {
    context: ".",
    dockerfile: "Dockerfile",
  },
  instanceType: "lite",  // Changed from standard-3 to match official example
  maxInstances: 1,       // Changed from 2 to match official example
  dev: {
    remote: true // Forces push to Cloudflare registry even in dev mode
  }
});

export const website = await SvelteKit("website", {
  name: app.name,
  adopt: true,
  entrypoint: "worker.js",
  compatibilityDate: "2025-01-01",
  domains: [{ domainName: "gateproof.dev", adopt: true }],
  url: true,
  build: {
    command: "bun run build",
  },
  bindings: {
    Sandbox: sandboxContainer,
  },
  env: {
    OPENCODE_ZEN_API_KEY: process.env.OPENCODE_ZEN_API_KEY ?? "",
  },
});

// NOTE: Removed separate DurableObjectNamespace declaration.
// The Container binding already sets up the DO - extra namespace may cause conflicts.

console.log(website.url);

await app.finalize();
