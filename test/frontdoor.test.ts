import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { Plan } from "../src/index";
import {
  getCinderCaseStudyContent,
  getHelloWorldSnippet,
  getHomepageContent,
  loadExampleFiles,
} from "../scripts/render-scope";
import { runHelloWorldWorkerLoopSmoke } from "../scripts/run-hello-world-worker-loop";
import helloWorldScope from "../examples/hello-world/plan";
import { startHelloWorldServer } from "../examples/hello-world/server";

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

  test("loads the cinder case study without sibling workspace inputs", () => {
    const files = loadExampleFiles();
    const caseStudy = getCinderCaseStudyContent();
    const record = caseStudy as unknown as Record<string, unknown>;
    const proofContract = caseStudy.artifacts.find((artifact) => artifact.label === "Proof contract");
    const provisioning = caseStudy.artifacts.find((artifact) => artifact.label === "Provisioning");

    expect("cinderProvision" in files).toBe(false);
    expect("cinderPlan" in files).toBe(false);
    expect(caseStudy.temporalStatus).toBe(
      "Historical chapter preserved; dogfood and hardening chapters green",
    );
    expect(caseStudy.historicalStatus).toContain("historical fixture chapter remains preserved");
    expect(caseStudy.primaryClaim).toContain("preserve an original historical proof chapter");
    expect(caseStudy.currentRepoStatus.title).toBe(
      "Public proof artifacts are canonical; sibling workspaces are not build inputs",
    );
    expect(proofContract?.code).toBeUndefined();
    expect(provisioning?.code).toBeUndefined();
    expect(caseStudy.artifacts.length).toBeGreaterThanOrEqual(4);
    expect(caseStudy.chapters.length).toBe(3);
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
