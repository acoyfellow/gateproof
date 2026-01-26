import alchemy from "alchemy";
import {
  Container,
  DurableObjectNamespace,
  SvelteKit,
  Worker,
} from "alchemy/cloudflare";
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
});

const sandboxContainer = await Container("sandbox", {
  className: "Sandbox",
  build: {
    context: ".",
    dockerfile: "Dockerfile",
  },
  instanceType: "lite",
  maxInstances: 2,
});

const sandboxWorkerName = `${app.name}-${app.stage}-sandbox`;

const sandboxWorker = await Worker("sandbox-worker", {
  name: sandboxWorkerName,
  adopt: true,
  entrypoint: "src/sandbox-worker.ts",
  compatibilityDate: "2025-01-01",
  compatibilityFlags: ["nodejs_compat"],
  dev: { port: 1337 },
  bindings: {
    Sandbox: sandboxContainer,
  },
});

const sandboxNamespace = DurableObjectNamespace("sandbox-namespace", {
  className: "Sandbox",
  scriptName: sandboxWorker.name,
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
    Sandbox: sandboxNamespace,
  },
  env: {
    OPENCODE_ZEN_API_KEY: process.env.OPENCODE_ZEN_API_KEY ?? "",
  },
});

console.log(website.url);

await app.finalize();
