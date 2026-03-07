/**
 * Production smoke gate: verify the public routes that matter to the live proof.
 * Run after deploy. No gateproof runtime dependency so deploy job needs no build.
 */
const demoUrl = process.env.DEMO_URL ?? "https://gateproof.dev";
const checks = [
  {
    path: "/",
    needle: "Build software in reverse.",
  },
  {
    path: "/case-studies",
    needle: "Historical validation records.",
  },
  {
    path: "/case-studies/cinder",
    needle: "Chapter 2: Gateproof docs dogfood proof",
  },
];

for (const check of checks) {
  const response = await fetch(`${demoUrl}${check.path}`, { redirect: "follow" });
  const body = await response.text();

  if (!response.ok) {
    console.error(
      `Smoke gate failed for ${check.path}: expected 200 but observed ${response.status}`,
    );
    process.exit(1);
  }

  if (!body.includes(check.needle)) {
    console.error(
      `Smoke gate failed for ${check.path}: response missing marker ${JSON.stringify(check.needle)}`,
    );
    process.exit(1);
  }

  console.log(`Smoke gate OK: ${check.path} ${response.status}`);
}
