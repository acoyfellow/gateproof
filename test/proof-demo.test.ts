import { describe, expect, test } from "bun:test";
import {
  PROOF_DEMO_NOTE,
  isCompleteProofArc,
  proofDemoPlan,
  proofDemoStepIds,
  proofDemoSteps,
} from "../demo/src/lib/proof-demo";

describe("homepage proof demo", () => {
  test("walks fail, attempt, plan.ts reject, bounded retry, then pass", () => {
    expect(proofDemoStepIds()).toEqual(["fail", "attempt", "tamper", "retry", "pass"]);
    expect(isCompleteProofArc(proofDemoStepIds())).toBe(true);
  });

  test("uses the public Plan.goals API and default forbidden contract file", () => {
    expect(proofDemoPlan).toContain("Plan.define({");
    expect(proofDemoPlan).toContain("goals: [{");
    expect(proofDemoPlan).toContain("createHttpObserveResource");
    expect(proofDemoPlan).toContain("Plan.runLoop");
    expect(proofDemoPlan).toContain("createOpenCodeWorker");
    expect(proofDemoPlan).toContain('allowedPaths: ["examples/hello-world/"]');
    expect(proofDemoSteps.some((step) => step.lines.some((line) => line.text.includes('forbidden path "plan.ts"')))).toBe(true);
    expect(PROOF_DEMO_NOTE).toContain("Illustrative terminal");
  });

  test("final step keeps the contract unchanged", () => {
    const last = proofDemoSteps.at(-1);
    expect(last?.id).toBe("pass");
    expect(last?.contract).toContain("unchanged");
    expect(last?.implementation).toContain("hello world");
  });
});
