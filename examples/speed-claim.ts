import { Gate, Evidence, Expectation, Report } from "../src/index";

const target = process.env.TARGET_URL;
const coldBaseline = Number(process.env.COLD_BUILD_MS ?? "0");
const requiredSavings = Number(process.env.MIN_DELTA_MS ?? "60000");

const gate = Gate.define({
  name: "Warm build is materially faster than cold",
  intent: "Proves the product's core performance claim with explicit timing evidence",
  prerequisites: [
    async () => Boolean(target),
    async () => Number.isFinite(coldBaseline) && coldBaseline > 0,
  ],
  exercise: async () => {
    // Trigger the build via your own endpoint before collecting timing evidence.
  },
  collect: [
    Evidence.timing({
      id: "warm-build-duration",
      measure: async () => {
        const startedAt = Date.now();
        const response = await fetch(`${target!.replace(/\/$/, "")}/build/warm`, {
          method: "POST",
        });
        if (!response.ok) {
          throw new Error(`Warm build failed with HTTP ${response.status}`);
        }
        return Date.now() - startedAt;
      },
    }),
    Evidence.control({
      id: "baseline",
      read: async () => ({ coldBaseline }),
      summarize: (data) => `cold baseline ${data.coldBaseline}ms`,
    }),
    Evidence.http({
      id: "warm-build-health",
      request: async () => fetch(`${target!.replace(/\/$/, "")}/build/warm/status`),
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
    minProofStrength: "strong",
  },
});

const result = await gate.run({
  env: process.env as Record<string, string | undefined>,
});

console.log(Report.text(result));
process.exit(result.status === "pass" ? 0 : 1);
