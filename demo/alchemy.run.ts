import alchemy from "alchemy";
import { CloudflareStateStore } from "alchemy/state";
import { SvelteKit } from "alchemy/cloudflare";

const app = await alchemy("gateproof-demo", {
  password: process.env.ALCHEMY_PASSWORD ?? "",
  stateStore: process.env.CI
    ? (scope) =>
        new CloudflareStateStore(scope, {
          apiToken: alchemy.secret(process.env.CLOUDFLARE_API_TOKEN),
          stateToken: alchemy.secret(process.env.ALCHEMY_STATE_TOKEN),
          forceUpdate: true,
        })
    : undefined,
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
  env: {
    OPENCODE_ZEN_API_KEY: process.env.OPENCODE_ZEN_API_KEY ?? "",
  },
});

console.log(website.url);

await app.finalize();
