import alchemy from "alchemy";
import { SvelteKit } from "alchemy/cloudflare";
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

const app = await alchemy("gateproof-demo");

export const website = await SvelteKit("website", {
  name: `${app.name}-${app.stage}-website`,
  adopt: true,
  domains: [{ domainName: "gateproof.dev", adopt: true }],
  url: true,
  build: {
    command: "bun run build",
  },
  env: {
    OPENCODE_ZEN_API_KEY: process.env.OPENCODE_ZEN_API_KEY,
  },
});

console.log(website.url);

await app.finalize();
