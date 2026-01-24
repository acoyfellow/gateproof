import type { website } from "../alchemy.run.ts";

// Alchemy's SvelteKit exports Env type from the website object
// Fallback to explicit type if Env is not available
type WebsiteEnv = typeof website extends { Env: infer E } 
  ? E 
  : {
      OPENCODE_ZEN_API_KEY?: string;
      ALCHEMY_TEST_VALUE?: string;
      AUTH_STORE?: KVNamespace;
      STORAGE?: R2Bucket;
    };

export interface CloudflarePlatform {
  env: WebsiteEnv;
  context: ExecutionContext;
  caches: CacheStorage & { default: Cache };
}

declare global {
  export type CloudflareEnv = WebsiteEnv;
}

declare module "cloudflare:workers" {
  namespace Cloudflare {
    export interface Env extends CloudflareEnv {}
  }
}
