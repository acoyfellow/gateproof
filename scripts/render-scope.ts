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

export interface CaseStudyArtifact {
  label: string;
  url: string;
  note: string;
  code?: string;
}

export interface CaseStudyEvidenceSection {
  title: string;
  summary: string;
  items: ReadonlyArray<string>;
  code?: string;
}

export interface CurrentRepoStatus {
  label: string;
  title: string;
  body: string;
}

export interface CinderCaseStudyContent {
  title: string;
  description: string;
  caseId: string;
  studyLabel: string;
  studyType: string;
  temporalStatus: string;
  primaryClaim: string;
  methodSummary: string;
  observedOutcome: string;
  abstract: string;
  historicalStatus: string;
  caseBoundary: ReadonlyArray<string>;
  procedure: ReadonlyArray<string>;
  findings: ReadonlyArray<string>;
  limitations: ReadonlyArray<string>;
  artifacts: ReadonlyArray<CaseStudyArtifact>;
  evidenceSections: ReadonlyArray<CaseStudyEvidenceSection>;
  currentRepoStatus: CurrentRepoStatus;
}

export interface CaseStudyEntry {
  id: string;
  number: number;
  title: string;
  description: string;
  href: string;
  iteration: string;
}

export function getCaseStudiesList(): ReadonlyArray<CaseStudyEntry> {
  return [
    {
      id: "cinder",
      number: 1,
      title: "Cinder",
      description:
        "Historical validation record for a Cinder proof loop on Cloudflare. Preserved claim, method, and artifacts.",
      href: "/case-studies/cinder",
      iteration: "Round one",
    },
  ];
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

const getCinderCurrentRepoStatus = (
  files: LoadedExampleFiles,
): CurrentRepoStatus => {
  if (!files.cinderAvailable) {
    return {
      label: "Current repo status",
      title: "Historical artifacts are not available in the local sibling workspace",
      body: `This page expects preserved Cinder files in ${cinderRoot}. Missing: ${files.missingCinderFiles.join(", ")}`,
    };
  }

  return {
    label: "Current repo status",
    title: "Historical artifacts are available locally",
    body:
      "The preserved Cinder files are present and typechecked against the local Gateproof package. Reproducing the live result still requires Cloudflare infrastructure and Cinder environment variables.",
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
  const cinderStatus = getCinderCurrentRepoStatus(files);

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

Status: ${cinderStatus.title}

${cinderStatus.body}

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
  const cinderStatus = getCinderCurrentRepoStatus(files);

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

Status: ${cinderStatus.title}. ${cinderStatus.body}`,
    "explanations/case-studies": `# Case Studies

Historical case records for Gateproof deployments. Each entry states the claim, method, preserved artifacts, and current reproducibility limits.

## 1. Cinder

Historical record of a Gateproof-driven Cinder run on Cloudflare. Provisioning lives in \`alchemy.run.ts\`; the proof contract is \`plan.ts\`. The page documents the preserved artifacts and does not claim a fresh live rerun.

- [Cinder case study](/case-studies/cinder) — inputs, outputs, and artifacts.
- [alchemy.run.ts](${cinderProvisionUrl}) — provisioning.
- [plan.ts](${cinderPlanUrl}) — proof contract.

Status: ${cinderStatus.title}. ${cinderStatus.body}

### What went wrong

The agent was allowed to modify \`plan.ts\` on the fly (we want that). Without guardrails, it wrote implementation into the plan—long inline scripts, app logic—so we effectively "wrote code 2x." The plan should stay declarative: *what must be true*, not *how*. Going forward we need guardrails (scope, lint, or plan-hygiene checks) when the agent edits \`plan.ts\`, so it doesn’t inject long \`Act.exec\` blocks or encode behavior that belongs in app code.

---

See the [Tutorial](/docs/tutorials/first-gate) to run a minimal loop. See [How-To](/docs/how-to/run-in-a-loop) to operate the runtime. See [Reference](/docs/reference/api) for the full API surface.`,
  };
}

export function getHomepageContent(): HomepageContent {
  return {
    eyebrow: "steer the loop",
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
    ctaEyebrow: "Case Studies",
    ctaTitle: "Proof loops in the wild.",
    ctaBody:
      "Real systems, one plan, one loop. Cinder is the first; more to come.",
    ctaHref: "/case-studies",
    ctaLabel: "See case studies",
    githubHref: "https://github.com/acoyfellow/gateproof",
    npmHref: "https://www.npmjs.com/package/gateproof",
  };
}

export function getCinderCaseStudyContent(): CinderCaseStudyContent {
  const files = loadExampleFiles();
  const currentRepoStatus = getCinderCurrentRepoStatus(files);
  const artifacts: ReadonlyArray<CaseStudyArtifact> = [
    {
      label: "Input repository",
      url: CINDER_START_REPO_URL,
      note: "Preserved pre-loop repository state for the historical run.",
    },
    {
      label: "Output repository",
      url: CINDER_END_REPO_URL,
      note: "Preserved post-loop repository state for the historical run.",
    },
    {
      label: "Proof contract",
      url: `${CINDER_END_REPO_URL}/blob/main/plan.ts`,
      note: "Historical plan.ts preserved as the proof contract for the run record.",
      code: files.cinderPlan,
    },
    {
      label: "Provisioning",
      url: `${CINDER_END_REPO_URL}/blob/main/alchemy.run.ts`,
      note: "Historical alchemy.run.ts preserved as the provisioning artifact for the run record.",
      code: files.cinderProvision,
    },
  ];

  return {
    title: "Cinder Round One",
    description:
      "Historical validation record for a Gateproof-driven Cinder run on Cloudflare. This page summarizes the preserved claim, method, artifacts, and current reproducibility limits.",
    caseId: "cinder-round-one",
    studyLabel: "Historical case record",
    studyType: "Single-case historical validation record",
    temporalStatus: "Historical completed study",
    primaryClaim:
      "A gate-defined proof loop was used to drive Cinder toward a state where the intended live checks passed.",
    methodSummary:
      "One historical run with preserved input and output repositories, fixed artifacts, and no mid-run human edits.",
    observedOutcome:
      "The historical record preserves a post-run repository, proof contract, and provisioning artifacts; this page reports that record rather than rerunning the live system.",
    abstract:
      "Cinder Round One is presented as a historical case record. The unit of analysis is one preserved proof-loop run on Cloudflare. The case record exposes the claim, the operating method, the bounded procedure, the preserved artifacts, and the current reproducibility limits. It does not assert a fresh live validation in the current session.",
    historicalStatus:
      "The page documents a completed historical study with preserved artifacts. It does not perform a live rerun.",
    caseBoundary: [
      "System under study: Cinder on Cloudflare.",
      "Unit of analysis: one historical round-one proof-loop run.",
      "Inputs treated as fixed artifacts: input repository, proof contract, and provisioning file.",
      "Outputs treated as fixed artifacts: output repository and preserved run artifacts.",
      "Out of scope for this page: a fresh live rerun against current infrastructure.",
    ],
    procedure: [
      "Input repository cloned.",
      "Provisioning artifact prepared the Cloudflare environment.",
      "Proof contract defined the observe, act, and assert conditions.",
      "A single unsupervised loop executed without mid-run human edits.",
      "The post-run repository and supporting artifacts were preserved for inspection.",
    ],
    findings: [
      "The case record preserves both the pre-loop and post-loop repositories.",
      "The proof contract and provisioning file remain inspectable as historical artifacts.",
      "The recorded study is bounded to one historical run rather than an active benchmark stream.",
      "Current local validation can confirm artifact availability, but not the original live result without external infrastructure.",
    ],
    limitations: [
      "This page does not execute a fresh live proof loop.",
      "The recorded outcome is interpreted from preserved artifacts and accompanying project notes.",
      "Reproduction still depends on external Cloudflare resources and environment secrets.",
      "The record concerns one system and one bounded historical study.",
    ],
    artifacts,
    evidenceSections: [
      {
        title: "Run conditions",
        summary: "Operating constraints recorded for the historical run.",
        items: [
          "Agent: Codex desktop, GPT-5.3.",
          "No human edits, review, or audit during the loop.",
          "The historical description states that the loop was started once and allowed to iterate to completion.",
        ],
      },
      {
        title: "Artifact notes",
        summary: "Preserved repositories and what each artifact represents.",
        items: artifacts.map((artifact) => `${artifact.label}: ${artifact.note}`),
      },
      {
        title: "Proof contract notes",
        summary: "How the proof contract is framed in the historical record.",
        items: [
          "The proof contract is stored in plan.ts.",
          "The contract is described as defining observe, act, and assert conditions against the live system.",
          "The artifact is preserved for inspection and linked directly from this page.",
        ],
        code: files.cinderPlan,
      },
      {
        title: "Provisioning notes",
        summary: "How the environment was provisioned for the historical run.",
        items: [
          "Provisioning is stored in alchemy.run.ts.",
          "The provisioning artifact is treated as a fixed historical input rather than a live deployment action on this page.",
          "The artifact is preserved for inspection and linked directly from this page.",
        ],
        code: files.cinderProvision,
      },
    ],
    currentRepoStatus,
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
