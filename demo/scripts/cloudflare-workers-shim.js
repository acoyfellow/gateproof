const unavailable = (name) => {
  throw new Error(
    `cloudflare:workers.${name} is unavailable in local Vite dev. Use a real Cloudflare runtime for this path.`
  );
};

export class DurableObject {
  constructor() {
    unavailable("DurableObject");
  }
}

export const env = new Proxy({}, {
  get(_target, property) {
    unavailable(`env.${String(property)}`);
  }
});

export default { DurableObject, env };
