import { Gate, Act, Assert } from "./src/index";
import { CloudflareProvider } from "./src/cloudflare/index";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const apiToken = process.env.CLOUDFLARE_API_TOKEN || "";
const workerName = process.argv[2] || "my-worker";
const testUrl = process.argv[3] || `https://${workerName}.workers.dev/`;

console.log(`Running E2E test with gateproof`);
console.log(`Worker: ${workerName}`);
console.log(`URL: ${testUrl}\n`);

const provider = CloudflareProvider({
  accountId,
  apiToken
});

const gate = {
  name: "smoke-test",
  observe: provider.observe({
    backend: "analytics",
    dataset: "worker_logs"
  }),
  act: [
    Act.browser({
      url: testUrl,
      headless: false,
      waitMs: 5000
    })
  ],
  assert: [Assert.noErrors()],
  stop: { idleMs: 3000, maxMs: 10000 },
  report: "pretty" as const
};

Gate.run(gate)
  .then((res) => {
    console.log(`\n✅ Test completed with status: ${res.status}`);
    if (res.status !== "success") {
      const errorTag = res.error && "_tag" in res.error ? (res.error as any)._tag : "unknown";
    console.error(`\n❌ Test failed. Error: ${errorTag}`);
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
