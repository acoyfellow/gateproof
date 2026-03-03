import { readFileSync } from "node:fs";
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
  test("loads the homepage snippet from the checked-in hello-world example", () => {
    const expected = readFileSync(
      path.join(repoRoot, "examples", "hello-world", "plan.ts"),
      "utf8",
    ).trim();

    expect(getHelloWorldSnippet()).toBe(expected);
    expect(getHomepageContent().snippetCode).toBe(expected);
  });

  test("loads the cinder case study from the sibling workspace", () => {
    const expectedProvision = readFileSync(path.join(cinderRoot, "alchemy.run.ts"), "utf8").trim();
    const expectedPlan = readFileSync(path.join(cinderRoot, "plan.ts"), "utf8").trim();
    const files = loadExampleFiles();
    const caseStudy = getCinderCaseStudyContent();

    expect(files.cinderAvailable).toBe(true);
    expect(getCinderProvisionSnippet()).toBe(expectedProvision);
    expect(getCinderPlanSnippet()).toBe(expectedPlan);
    expect(caseStudy.provisionCode).toBe(expectedProvision);
    expect(caseStudy.planCode).toBe(expectedPlan);
    expect(caseStudy.statusTitle).toBe("Structurally ready");
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
