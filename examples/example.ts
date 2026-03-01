import { Gate, Evidence, Expectation, Report } from "../src/index";

const apiUrl = process.argv[2] || "https://api.example.com";

const gate = Gate.define({
  name: "Health endpoint is live",
  intent: "Proves the deployed API responds to a basic health check",
  prerequisites: [
    async () => Boolean(apiUrl)
  ],
  exercise: async () => {
    // No-op: this claim reads externally observable state directly.
  },
  collect: [
    Evidence.http({
      id: "health-response",
      request: async () => fetch(`${apiUrl.replace(/\/$/, "")}/health`),
    }),
  ],
  expect: async (evidence) => {
    const response = evidence.find((entry) => entry.id === "health-response");
    const status = Number(
      (response?.data as { status?: number } | undefined)?.status ?? 0
    );

    if (status === 200) {
      return Expectation.ok("health endpoint returned HTTP 200");
    }

    return Expectation.fail("health endpoint did not return HTTP 200", { status });
  },
  requirements: {
    minKinds: ["outcome"],
    minProofStrength: "strong",
  },
});

const result = await gate.run({
  env: process.env as Record<string, string | undefined>,
  target: apiUrl,
});

console.log(Report.text(result));
process.exit(result.status === "pass" ? 0 : 1);
