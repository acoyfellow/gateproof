import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const replacements = {
  "dist/index.js": ["./lib/container", "./lib/utils"],
  "dist/lib/container.js": ["./helpers"]
};

const packageRoots = [
  resolve(process.cwd(), "node_modules/@cloudflare/containers"),
  resolve(process.cwd(), "node_modules/@cloudflare/sandbox/node_modules/@cloudflare/containers")
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const shimAbsolutePath = resolve(process.cwd(), "scripts/cloudflare-workers-shim.js");
const makeRelativeImport = (fromDir) => {
  let rel = relative(fromDir, shimAbsolutePath).split("\\").join("/");
  if (!rel.startsWith(".") && !rel.startsWith("/")) {
    rel = `./${rel}`;
  }
  return rel;
};
let patched = false;

for (const root of packageRoots) {
  for (const [relativePath, specifiers] of Object.entries(replacements)) {
    const targetPath = resolve(root, relativePath);
    if (!existsSync(targetPath)) continue;

    let contents = readFileSync(targetPath, "utf8");
    let modified = contents;
    for (const specifier of specifiers) {
      const pattern = new RegExp(`${escapeRegExp(specifier)}(?!\\.js)`, "g");
      modified = modified.replace(pattern, `${specifier}.js`);
    }

    if (relativePath === "dist/lib/container.js") {
      const importPattern = /import\s*\{\s*DurableObject\s*\}\s*from\s*['"]cloudflare:workers['"];?/;
      const shimImport = `import { DurableObject } from '${makeRelativeImport(dirname(targetPath))}';`;
      modified = modified.replace(importPattern, shimImport);
    }

    if (modified !== contents) {
      writeFileSync(targetPath, modified, "utf8");
      console.log(`patched ${targetPath}`);
      patched = true;
    }
  }
}

if (!patched) {
  console.log("@cloudflare/containers already patched or not installed");
}
