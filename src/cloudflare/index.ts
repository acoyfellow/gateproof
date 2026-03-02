import type { CloudflareObserveDefinition } from "../index";

export const Cloudflare = {
  observe(
    definition: Omit<CloudflareObserveDefinition, "kind">,
  ): CloudflareObserveDefinition {
    return {
      kind: "cloudflare-workers-logs",
      backend: "workers-logs",
      ...definition,
    };
  },
};
