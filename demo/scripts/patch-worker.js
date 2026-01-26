import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const workerPath = resolve(process.cwd(), "worker.js");
let contents = readFileSync(workerPath, "utf8");

contents = contents.replace(
  'import { Server } from ".svelte-kit/output/server/index.js";',
  'import { Server } from "./.svelte-kit/output/server/index.js";'
);
contents = contents.replace(
  'import { manifest, prerendered, base_path } from ".svelte-kit/cloudflare-tmp/manifest.js";',
  'import { manifest, prerendered, base_path } from "./.svelte-kit/cloudflare-tmp/manifest.js";'
);

if (!contents.includes('from "@cloudflare/sandbox"')) {
  contents = `export { Sandbox } from "@cloudflare/sandbox";\n${contents}`;
}

writeFileSync(workerPath, contents);
