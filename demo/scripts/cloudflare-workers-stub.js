const fallbackEnv = new Proxy({}, {
  get() {
    return undefined;
  }
});

const cloudflareModule = await (async () => {
  try {
    return await import("cloudflare:workers");
  } catch {
    return {
      DurableObject: class DurableObject {},
      env: fallbackEnv
    };
  }
})();

export const DurableObject = cloudflareModule.DurableObject;
export const env = cloudflareModule.env;
export default cloudflareModule;
