/**
 * Production smoke gate: GET demo URL and assert 200.
 * Run after deploy. No gateproof runtime dependency so deploy job needs no build.
 */
const demoUrl = process.env.DEMO_URL ?? "https://gateproof.dev";

const res = await fetch(demoUrl, { redirect: "follow" });
if (!res.ok) {
  console.error(`Smoke gate failed: ${res.status} ${res.statusText} for ${demoUrl}`);
  process.exit(1);
}
console.log(`Smoke gate OK: ${demoUrl} ${res.status}`);
