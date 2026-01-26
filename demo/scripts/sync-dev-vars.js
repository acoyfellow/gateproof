import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), "..", ".env");
const outPath = resolve(process.cwd(), ".dev.vars");

const allowlist = new Set(["OPENCODE_ZEN_API_KEY", "OPENAI_API_KEY", "PRD_MODEL"]);

const lines = readFileSync(envPath, "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

const entries = [];
for (const line of lines) {
  const [key, ...rest] = line.split("=");
  if (!key || rest.length === 0) continue;
  if (!allowlist.has(key)) continue;
  entries.push(`${key}=${rest.join("=").trim()}`);
}

writeFileSync(outPath, entries.join("\n") + "\n");
