import alchemy from "alchemy";
import { SvelteKit } from "alchemy/cloudflare";

const app = await alchemy("gateproof-demo");

export const website = await SvelteKit("website", {
  name: `${app.name}-${app.stage}-website`,
  adopt: true,
  domains: [{ domainName: "gateproof.dev", adopt: true }],
  url: true,
  build: {
    command: "bun run build",
  },
});

console.log(website.url);

await app.finalize();
