# gateproof Demo

This is the gateproof demo site, a SvelteKit application deployed to Cloudflare Workers using Alchemy.

It includes:

- A SvelteKit frontend with server-side rendering
- Cloudflare Workers with Static Assets deployment
- Integration with `@cloudflare/sandbox` for code execution via container-backed Durable Objects
- Configuration using `alchemy.run.ts` as the single source of truth

## Development

```bash
bun run dev
```

This runs `alchemy dev`, which:

1. Builds and pushes the sandbox container image to Cloudflare's registry
2. Deploys the Sandbox Durable Object to Cloudflare (container-backed DOs require remote infrastructure)
3. Starts a local Vite dev server at `http://localhost:5173/` with hot-reload

Sandbox endpoints work against the deployed worker at `https://gateproof.dev/api/prd/run`. The local Vite server is for UI development.

## Environment Variables

Required in `../.env`:

- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID
- `ALCHEMY_PASSWORD`: Alchemy state encryption password
- `OPENCODE_ZEN_API_KEY`: For PRD generation functionality

More information on Cloudflare credentials: [Cloudflare Auth Guide](https://alchemy.run/guides/cloudflare/)

## Production Deployment

```bash
bun run deploy
```

This uses `alchemy.run.ts` to deploy the SvelteKit worker with the Sandbox container binding, static assets, and all Cloudflare resources.

## Accessing Cloudflare Resources

```typescript
// In a +page.server.ts file
import { env } from "cloudflare:workers";

export async function load() {
  const kvData = await env.AUTH_STORE?.get('some-key');
  return { kvData };
}
```

Or via the platform parameter:

```typescript
export async function load({ platform }) {
  const kvData = await platform?.env?.AUTH_STORE?.get('some-key');
  return { kvData };
}
```

Type definitions are in [`src/env.d.ts`](./src/env.d.ts) and [`src/app.d.ts`](./src/app.d.ts).

## Cleanup

```bash
bun run destroy
```
