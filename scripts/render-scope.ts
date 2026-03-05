import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ScopeFile } from "../src/index";

export interface RenderReadmeOptions {
  fileName?: string;
  runCommand?: string;
}

export interface PrincipleCard {
  title: string;
  body: string;
}

export interface HomepageContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  snippetLabel: string;
  snippetTitle: string;
  snippetBody: string;
  snippetCode: string;
  principles: ReadonlyArray<PrincipleCard>;
  ctaEyebrow: string;
  ctaTitle: string;
  ctaBody: string;
  ctaHref: string;
  ctaLabel: string;
  githubHref: string;
  npmHref: string;
}

export interface CinderCaseStudyContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  provisionLabel: string;
  provisionCode: string;
  provisionUrl: string;
  planLabel: string;
  planCode: string;
  planUrl: string;
  planPseudocode: string;
  support: ReadonlyArray<string>;
  statusLabel: string;
  statusTitle: string;
  statusBody: string;
  startedWith: string;
  methodStatement: string;
  roundTwoTeaser: string;
  historyTitle: string;
  historyBody: string;
  startRepoLabel: string;
  startRepoUrl: string;
  endRepoLabel: string;
  endRepoUrl: string;
  /** Run conditions: agent, model, and discipline (e.g. no mid-loop review). */
  runConditions: ReadonlyArray<string>;
}

export interface LoadedExampleFiles {
  helloWorldPlan: string;
  rootPlan: string;
  cloudflareMinimalPlan: string;
  runloopWorkerPlan: string;
  cinderProvision: string;
  cinderPlan: string;
  cinderAvailable: boolean;
  missingCinderFiles: ReadonlyArray<string>;
}

export interface PatternContent {
  id: string;
  tab: string;
  title: string;
  description: string;
  language?: string;
  code: string;
}

export interface DualityContent {
  artifactName: string;
  unitLabel: string;
  unitExample: { id: string; title: string; gatePreview: string };
  resultValues: string;
}

export type DocsKind = "tutorial" | "how-to" | "reference" | "explanation";

export interface DocsEntry {
  slug: string;
  title: string;
  kind: DocsKind;
}

export interface DocsCategory {
  label: string;
  entries: ReadonlyArray<DocsEntry>;
}

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, "..");
const cinderRoot = path.resolve(repoRoot, "..", "cinder");

const helloWorldPlanPath = path.join(repoRoot, "examples", "hello-world", "plan.ts");
const rootPlanPath = path.join(repoRoot, "plan.ts");
const cloudflareMinimalPlanPath = path.join(repoRoot, "examples", "cloudflare-minimal", "plan.ts");
const runloopWorkerPlanPath = path.join(repoRoot, "examples", "runloop-worker", "plan.ts");
const cinderProvisionPath = path.join(cinderRoot, "alchemy.run.ts");
const cinderPlanPath = path.join(cinderRoot, "plan.ts");

const CINDER_START_REPO_URL = "https://github.com/acoyfellow/cinder-round-one-start";
const CINDER_END_REPO_URL = "https://github.com/acoyfellow/cinder-round-one-end";

const apiList = [
  "`Gate.define(...)`",
  "`Plan.define(...)`",
  "`Plan.run(...)`",
  "`Plan.runLoop(...)`",
  "`Cloudflare.observe(...)`",
  "`Assert.hasAction(...)`",
  "`Assert.responseBodyIncludes(...)`",
  "`Assert.numericDeltaFromEnv(...)`",
];

const trimSource = (source: string): string => source.trim();

const missingSnippet = (filePath: string, label: string): string =>
  `// ${label} is not available on this machine yet.\n// Expected at: ${filePath}`;

const readSourceFile = (filePath: string, label: string): { code: string; available: boolean } => {
  if (!existsSync(filePath)) {
    return {
      code: missingSnippet(filePath, label),
      available: false,
    };
  }

  return {
    code: trimSource(readFileSync(filePath, "utf8")),
    available: true,
  };
};

const getCanonicalGoals = (scope: ScopeFile): ReadonlyArray<string> =>
  scope.plan.goals.map((goal) => goal.title);

export function getDefaultScope(): ScopeFile {
  return {
    spec: {
      title: "Gateproof",
      tutorial: {
        goal: "Prove one tiny thing.",
        outcome: "The run only passes when the live claim holds.",
      },
      howTo: {
        task: "Run plan.ts against the live system.",
        done: "All gates pass and the product claim holds.",
      },
      explanation: {
        summary:
          "plan.ts is the proof loop. Provision once, prove often. The loop reruns until the live system earns the gate.",
      },
    },
    plan: {
      goals: [
        {
          id: "example",
          title: "Example goal",
          gate: { observe: undefined, act: [], assert: [] },
        },
      ],
      loop: { maxIterations: 1, stopOnFailure: true },
    },
  };
}

export function loadExampleFiles(): LoadedExampleFiles {
  const helloWorldPlan = readSourceFile(helloWorldPlanPath, "The hello-world example");
  const rootPlan = readSourceFile(rootPlanPath, "The root plan");
  const cloudflareMinimalPlan = readSourceFile(
    cloudflareMinimalPlanPath,
    "The cloudflare-minimal example",
  );
  const runloopWorkerPlan = readSourceFile(
    runloopWorkerPlanPath,
    "The runloop-worker example",
  );
  const cinderProvision = readSourceFile(cinderProvisionPath, "The Cinder provision file");
  const cinderPlan = readSourceFile(cinderPlanPath, "The Cinder proof file");

  const missingCinderFiles = [
    !cinderProvision.available ? cinderProvisionPath : null,
    !cinderPlan.available ? cinderPlanPath : null,
  ].filter((filePath): filePath is string => filePath !== null);

  return {
    helloWorldPlan: helloWorldPlan.code,
    rootPlan: rootPlan.code,
    cloudflareMinimalPlan: cloudflareMinimalPlan.code,
    runloopWorkerPlan: runloopWorkerPlan.code,
    cinderProvision: cinderProvision.code,
    cinderPlan: cinderPlan.code,
    cinderAvailable: missingCinderFiles.length === 0,
    missingCinderFiles,
  };
}

export function getHelloWorldSnippet(): string {
  return `\
import { Effect } from "effect";
import {
  Act,
  Assert,
  Gate,
  Plan,
  createHttpObserveResource,
} from "gateproof";

const plan = Plan.define({
  goals: [{
    id: "hello-world",
    title: "GET / returns hello world",
    gate: Gate.define({
      observe: createHttpObserveResource({ url: "https://example.com" }),
      act: [Act.exec("curl -sf https://example.com")],
      assert: [
        Assert.httpResponse({ status: 200 }),
        Assert.responseBodyIncludes("hello world"),
        Assert.noErrors(),
      ],
    }),
  }],
});

if (import.meta.main) {
  const result = await Effect.runPromise(Plan.run(plan));
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "pass") process.exitCode = 1;
}`;
}

export function getRootPlanSnippet(): string {
  return loadExampleFiles().rootPlan;
}

export function getCinderProvisionSnippet(): string {
  return loadExampleFiles().cinderProvision;
}

export function getCinderPlanSnippet(): string {
  return loadExampleFiles().cinderPlan;
}

const getCinderStatus = (
  files: LoadedExampleFiles,
): Pick<CinderCaseStudyContent, "statusLabel" | "statusTitle" | "statusBody"> => {
  if (!files.cinderAvailable) {
    return {
      statusLabel: "Case Study Status",
      statusTitle: "Cinder is not available locally",
      statusBody: `This page reads live files from ${cinderRoot}. Missing: ${files.missingCinderFiles.join(", ")}`,
    };
  }

  return {
    statusLabel: "Current Status",
    statusTitle: "Structurally ready",
    statusBody:
      "Typechecked against the local Gateproof package. Running it end-to-end still requires live Cloudflare infrastructure and the real Cinder environment variables.",
  };
};

export function renderPlanSnippet(_scope: ScopeFile, _options: { fileName?: string } = {}): string {
  return getRootPlanSnippet();
}

export function renderScopeSnippet(_scope: ScopeFile, _options: { fileName?: string } = {}): string {
  return getRootPlanSnippet();
}

export function renderReadme(
  scope: ScopeFile,
  options: RenderReadmeOptions = {},
): string {
  const files = loadExampleFiles();
  const fileName = options.fileName ?? "plan.ts";
  const runCommand = options.runCommand ?? `bun run ${fileName}`;
  const canonicalGoals = getCanonicalGoals(scope);
  const cinderStatus = getCinderStatus(files);

  return `# Gateproof

Gateproof runs the proof, sends in the worker, and keeps going until the live claim is true.

## Tutorial

Goal: Start with one tiny gate that is small on purpose and complete on purpose.

### examples/hello-world/plan.ts

\`\`\`ts
${files.helloWorldPlan}
\`\`\`

Outcome: The loop only passes when the live response says hello world.

## First Case Study: Cinder

### alchemy.run.ts

\`\`\`ts
${files.cinderProvision}
\`\`\`

### plan.ts

\`\`\`ts
${files.cinderPlan}
\`\`\`

Status: ${cinderStatus.statusTitle}

${cinderStatus.statusBody}

## Roadmap

Gateproof is not ready to fully dogfood itself on a case study like Cinder yet. The next phase is about tightening the guardrails, not adding another rewrite.

- Save the latest real proof result to disk so the loop always has a concrete last-known truth.
- Make finalize refuse to ship unless the saved real proof result is fully green.
- Separate the real proof path from side experiments so exploration can happen without polluting the proof story.
- Let plans choose direct evidence when log tailing is flaky, so a valid live pass does not fail on observation noise alone.
- Dogfood Gateproof on Cinder again only after those guardrails are in place.

## How To

Task: ${scope.spec.howTo.task}

Done when: ${scope.spec.howTo.done}

Run it:

\`\`\`bash
bun run example:hello-world:worker
bun run alchemy.run.ts
${runCommand}
\`\`\`

## Breaking Changes In 0.4.0

- \`Prd.*\` is gone
- \`Claim.*\` is gone
- \`plan.ts\` is the canonical entrypoint
- \`Plan.*\` replaces the old front door

## Reference

Files:
- \`examples/hello-world/plan.ts\`
- \`alchemy.run.ts\`
- \`plan.ts\`

Canonical gates:
${canonicalGoals.map((goal) => `- ${goal}`).join("\n")}

Loop:
- \`maxIterations: 1\`
- \`stopOnFailure: true\`

Core API:
${apiList.map((entry) => `- ${entry}`).join("\n")}

## Explanation

${scope.spec.explanation.summary}
`;
}

export function getDocsManifest(): ReadonlyArray<DocsCategory> {
  return [
    {
      label: "Overview",
      entries: [{ slug: "index", title: "Documentation", kind: "tutorial" }],
    },
    {
      label: "Tutorials",
      entries: [{ slug: "tutorials/first-gate", title: "Your First Gate", kind: "tutorial" }],
    },
    {
      label: "How-To Guides",
      entries: [{ slug: "how-to/run-in-a-loop", title: "Run in a Loop", kind: "how-to" }],
    },
    {
      label: "Reference",
      entries: [{ slug: "reference/api", title: "API Reference", kind: "reference" }],
    },
    {
      label: "Explanations",
      entries: [
        { slug: "explanations/case-studies", title: "Case Studies", kind: "explanation" },
      ],
    },
  ];
}

export function renderDocsContent(scope?: ScopeFile): Record<string, string> {
  const resolvedScope = scope ?? getDefaultScope();
  const files = loadExampleFiles();
  const canonicalGoals = getCanonicalGoals(resolvedScope);
  const cinderStatus = getCinderStatus(files);

  const cinderPlanUrl = `${CINDER_END_REPO_URL}/blob/main/plan.ts`;
  const cinderProvisionUrl = `${CINDER_END_REPO_URL}/blob/main/alchemy.run.ts`;

  return {
    "index": `# Documentation

Four ways to use Gateproof docs:

- **Tutorial** — [Your First Gate](/docs/tutorials/first-gate): Learn by doing. One file, one gate, one pass.
- **How-to** — [Run in a Loop](/docs/how-to/run-in-a-loop): Prove the live system. Task, steps, done condition.
- **Reference** — [API Reference](/docs/reference/api): The public surface. Functions and types.
- **Explanation** — [Case Studies](/docs/explanations/case-studies): Proof loops in the wild. Cinder and more.`,
    "tutorials/first-gate": `# Tutorial: Your First Gate

**Goal:** ${resolvedScope.spec.tutorial.goal}

**Outcome:** ${resolvedScope.spec.tutorial.outcome}

---

Do this: create one tiny proof file.

\`\`\`ts
${files.helloWorldPlan}
\`\`\`

Run it. The loop passes only when the live response matches the claim. One file, one gate, one pass.`,
    "how-to/run-in-a-loop": `# How To: Prove The Live System

**Task:** ${resolvedScope.spec.howTo.task}

**Done when:** ${resolvedScope.spec.howTo.done}

---

## Steps

1. Run the proof once.
2. Select the first failing gate.
3. Send in the worker for one bounded attempt.
4. Commit the attempt.
5. Rerun until the live claim is green or the loop stops.

## Gates that matter

${canonicalGoals.map((g) => `- ${g}`).join("\n")}`,
    "reference/api": `# Reference: API

Public surface for the proof loop. This is the curated list of entrypoints and assertions.

## Core API

${apiList.map((entry) => `- ${entry}`).join("\n")}

## Cinder artifacts

- [alchemy.run.ts](${cinderProvisionUrl}) — provisioning
- [plan.ts](${cinderPlanUrl}) — proof contract

Status: ${cinderStatus.statusTitle}. ${cinderStatus.statusBody}`,
    "explanations/case-studies": `# Case Studies

Proof loops run against real systems. Here we list case studies that use Gateproof to drive and verify behavior.

## 1. Cinder

CI runner acceleration on Cloudflare: webhook intake, job queue, runner pool, cache restore/push, and a warm-build speed claim. Provisioning lives in \`alchemy.run.ts\`; the proof contract is \`plan.ts\`. The loop ran unsupervised (no mid-loop review or edits) until all gates passed.

- [Cinder case study](/cinder) — inputs, outputs, and artifacts.
- [alchemy.run.ts](${cinderProvisionUrl}) — provisioning.
- [plan.ts](${cinderPlanUrl}) — proof contract.

Status: ${cinderStatus.statusTitle}. ${cinderStatus.statusBody}

### What went wrong

The agent was allowed to modify \`plan.ts\` on the fly (we want that). Without guardrails, it wrote implementation into the plan—long inline scripts, app logic—so we effectively "wrote code 2x." The plan should stay declarative: *what must be true*, not *how*. Going forward we need guardrails (scope, lint, or plan-hygiene checks) when the agent edits \`plan.ts\`, so it doesn’t inject long \`Act.exec\` blocks or encode behavior that belongs in app code.

---

See the [Tutorial](/docs/tutorials/first-gate) to run a minimal loop. See [How-To](/docs/how-to/run-in-a-loop) to operate the runtime. See [Reference](/docs/reference/api) for the full API surface.`,
  };
}

export function getHomepageContent(): HomepageContent {
  return {
    eyebrow: "Gateproof",
    headline: "Build software in reverse.",
    subheadline:
      "Start from the spec; let the loop make reality match.",
    snippetLabel: "hello world",
    snippetTitle: "One file. One gate. One real pass condition.",
    snippetBody: "Define what done looks like. Hand it to the loop.",
    snippetCode: getHelloWorldSnippet(),
    principles: [
      {
        title: "Define done first",
        body:
          "The gate describes the finished behavior before any code exists.",
      },
      {
        title: "The loop runs the worker",
        body:
          "One failing gate, one bounded attempt, loop repeats until the live system passes.",
      },
      {
        title: "One file, one contract",
        body:
          "The same file the human reads is the file the loop hands to the worker.",
      },
    ],
    ctaEyebrow: "Case Study",
    ctaTitle: "Cinder",
    ctaBody:
      "Provision the world once. Keep proving the live warm-build claim until it is actually true.",
    ctaHref: "/cinder",
    ctaLabel: "Read the Cinder case study",
    githubHref: "https://github.com/acoyfellow/gateproof",
    npmHref: "https://www.npmjs.com/package/gateproof",
  };
}

export function getCinderCaseStudyContent(): CinderCaseStudyContent {
  const files = loadExampleFiles();
  const status = getCinderStatus(files);

  return {
    eyebrow: "Cinder Round One",
    headline: "Inputs and outputs.",
    subheadline:
      "One proof loop was executed. Input and output repositories were frozen. Read-only.",
    provisionLabel: "alchemy.run.ts",
    provisionCode: files.cinderProvision,
    provisionUrl: `${CINDER_END_REPO_URL}/blob/main/alchemy.run.ts`,
    planLabel: "plan.ts",
    planCode: files.cinderPlan,
    planUrl: `${CINDER_END_REPO_URL}/blob/main/plan.ts`,
    planPseudocode: `Plan.define({
  goals: [{ gate: { observe, act, assert } }],
})`,
    support: [
      "Input repository cloned.",
      "plan.ts authored with gates. Gates assert against the live system.",
      "Loop executed. Agent iterated on failing gates until pass.",
      "Final state committed. Repository locked.",
      "Output repository preserved for inspection.",
    ],
    startedWith: "a repo and a live claim.",
    methodStatement: "We ran a disciplined, slow loop. Spec to Reality.",
    roundTwoTeaser: "Hypothesis proven. Round two: something soon.",
    historyTitle: "Artifacts",
    historyBody:
      "Two repositories. Read-only. Input is the pre-loop state. Output is the post-loop state. Diff between them shows gates added, files modified, structure that emerged.",
    startRepoLabel: "Input repository",
    startRepoUrl: CINDER_START_REPO_URL,
    endRepoLabel: "Output repository",
    endRepoUrl: CINDER_END_REPO_URL,
    runConditions: [
      "Agent: Codex desktop, GPT-5.3.",
      "No human edits, review, or audit during the loop. Hit run once and let the agent iterate until all gates passed.",
    ],
    ...status,
  };
}

export function getFrontdoorContent(_scope?: ScopeFile): CinderCaseStudyContent {
  return getCinderCaseStudyContent();
}

export function getPatternsContent(): ReadonlyArray<PatternContent> {
  const files = loadExampleFiles();

  return [
    {
      id: "minimal",
      tab: "Minimal",
      title: "One file, one gate, one pass",
      description: "HTTP observe + exec + assert. The smallest complete proof.",
      language: "typescript",
      code: files.helloWorldPlan,
    },
    {
      id: "cloudflare",
      tab: "Cloudflare",
      title: "Observe worker logs",
      description: "Cloudflare.observe() tails worker logs. Assert on actions logged.",
      language: "typescript",
      code: files.cloudflareMinimalPlan,
    },
    {
      id: "runloop",
      tab: "Worker loop",
      title: "Plan.runLoop with worker",
      description: "The loop hands the first failing gate to a worker, commits, reruns.",
      language: "typescript",
      code: files.runloopWorkerPlan,
    },
    {
      id: "reference",
      tab: "API reference",
      title: "Core API",
      description: "What the Cinder proof loop actually uses.",
      language: "markdown",
      code: apiList.map((entry) => entry.replace(/^`|`$/g, "")).join("\n"),
    },
  ];
}

export function getDualityContent(scope?: ScopeFile): DualityContent {
  const resolvedScope = scope ?? getDefaultScope();
  const firstGoal = resolvedScope.plan.goals[0];

  return {
    artifactName: "plan.ts",
    unitLabel: "goal",
    unitExample: {
      id: firstGoal?.id ?? "example",
      title: firstGoal?.title ?? "Example goal",
      gatePreview: "observe + act + assert",
    },
    resultValues: "pass | fail | skip | inconclusive",
  };
}
