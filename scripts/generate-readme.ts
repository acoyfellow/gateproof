import { getDefaultScope, renderReadme } from "./render-scope";

let scope;
try {
  scope = (await import("../plan")).default;
} catch {
  scope = getDefaultScope();
}

const readme = renderReadme(scope, {
  fileName: "plan.ts",
  runCommand: "bun run plan.ts",
});

await Bun.write(new URL("../README.md", import.meta.url), readme);
console.log("README.md regenerated");
