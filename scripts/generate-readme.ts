import scope from "../plan";
import { renderReadme } from "./render-scope";

const readme = renderReadme(scope, {
  fileName: "plan.ts",
  runCommand: "bun run plan.ts",
});

await Bun.write(new URL("../README.md", import.meta.url), readme);
console.log("README.md regenerated from plan.ts");
