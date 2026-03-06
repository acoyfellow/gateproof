import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { Plan } from "../src/index";
import {
  getCinderCaseStudyContent,
  getCinderPlanSnippet,
  getCinderProvisionSnippet,
  getHelloWorldSnippet,
  getHomepageContent,
  loadExampleFiles,
} from "../scripts/render-scope";
import { runHelloWorldWorkerLoopSmoke } from "../scripts/run-hello-world-worker-loop";
import helloWorldScope from "../examples/hello-world/plan";
import { startHelloWorldServer } from "../examples/hello-world/server";

const repoRoot = path.resolve(import.meta.dir, "..");
const cinderRoot = path.resolve(repoRoot, "..", "cinder");

describe("front-door artifacts", () => {
  test("loads the homepage snippet as a minimal runnable example", () => {
    const snippet = getHelloWorldSnippet();
    expect(getHomepageContent().snippetCode).toBe(snippet);
    expect(snippet).toContain('from "gateproof"');
    expect(snippet).toContain("Plan.define");
    expect(snippet).toContain("hello-world");
    expect(snippet).toContain("createHttpObserveResource");
    expect(snippet).toContain("Assert.httpResponse");
    expect(snippet).toContain("import.meta.main");
    expect(snippet).toContain("Effect.runPromise(Plan.run(plan))");
  });

  test.skipIf(!existsSync(path.join(cinderRoot, "alchemy.run.ts")))(
    "loads the cinder case study from the sibling workspace",
    () => {
    const expectedProvision = readFileSync(path.join(cinderRoot, "alchemy.run.ts"), "utf8").trim();
    const expectedPlan = readFileSync(path.join(cinderRoot, "plan.ts"), "utf8").trim();
    const files = loadExampleFiles();
    const caseStudy = getCinderCaseStudyContent();
    const record = caseStudy as unknown as Record<string, unknown>;
    const proofContract = caseStudy.artifacts.find((artifact) => artifact.label === "Proof contract");
    const provisioning = caseStudy.artifacts.find((artifact) => artifact.label === "Provisioning");

    expect(files.cinderAvailable).toBe(true);
    expect(getCinderProvisionSnippet()).toBe(expectedProvision);
    expect(getCinderPlanSnippet()).toBe(expectedPlan);
    expect(caseStudy.temporalStatus).toBe("Historical chapter preserved; current chapter green");
    expect(caseStudy.historicalStatus).toContain("historical fixture chapter remains preserved");
    expect(caseStudy.primaryClaim).toContain("preserve an original historical proof chapter");
    expect(caseStudy.currentRepoStatus.title).toBe(
      "Public proof artifacts are available; local sibling artifacts are optional",
    );
    expect(proofContract?.code).toBe(expectedPlan);
    expect(provisioning?.code).toBe(expectedProvision);
    expect(caseStudy.artifacts.length).toBeGreaterThanOrEqual(4);
    expect(caseStudy.chapters.length).toBe(2);
    expect("roundTwoTeaser" in record).toBe(false);
  });

  test("smoke-runs the checked-in hello-world example", async () => {
    const server = startHelloWorldServer();

    try {
      const result = await Effect.runPromise(Plan.run(helloWorldScope.plan));

      expect(result.status).toBe("pass");
      expect(result.goals[0]?.status).toBe("pass");
    } finally {
      server.stop(true);
    }
  });

  test("smoke-runs the built-in worker loop on hello world", async () => {
    const result = await runHelloWorldWorkerLoopSmoke();

    expect(result.status).toBe("pass");
    expect(result.commits).toBe(2);
    expect(result.finalBody).toBe("hello world");
  });
});
