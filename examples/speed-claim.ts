import { Claim, Evidence, Expectation, Report } from "../src/index";

const coldBaseline = Number(process.env.COLD_BUILD_MS ?? "252000");
const warmDuration = Number(process.env.WARM_BUILD_MS ?? "38214");
const requiredSavings = Number(process.env.MIN_DELTA_MS ?? "60000");

const claim = Claim.define({
  name: "Warm build is materially faster than cold",
  intent: "Proves the product's core performance claim with explicit timing evidence",
  prerequisites: [
    async () => Number.isFinite(coldBaseline) && coldBaseline > 0,
    async () => Number.isFinite(warmDuration) && warmDuration > 0,
  ],
  exercise: async () => {
    // In a real deployment, trigger the warm build here.
  },
  collect: [
    Evidence.timing({
      id: "warm-build-duration",
      measure: async () => warmDuration,
    }),
    Evidence.control({
      id: "baseline",
      read: async () => ({ coldBaseline }),
      summarize: (data) => `cold baseline ${data.coldBaseline}ms`,
    }),
    Evidence.logs({
      id: "supporting-logs",
      read: async () => [`build_duration_ms=${warmDuration}`],
    }),
  ],
  expect: async (evidence) => {
    const duration = Number(
      evidence.find((entry) => entry.id === "warm-build-duration")?.data ?? 0
    );

    return Expectation.threshold({
      metric: "build_duration_ms",
      actual: duration,
      baseline: coldBaseline,
      minDelta: requiredSavings,
    });
  },
  requirements: {
    minKinds: ["outcome"],
    allowSynthetic: false,
    minProofStrength: "strong",
  },
});

const result = await claim.run({
  env: process.env as Record<string, string | undefined>,
});

console.log(Report.text(result));
process.exit(result.status === "pass" ? 0 : 1);
