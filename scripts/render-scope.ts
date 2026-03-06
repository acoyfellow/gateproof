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

export interface CaseStudyChapter {
  id: string;
  label: string;
  status: string;
  primaryClaim: string;
  methodSummary: string;
  observedOutcome: string;
  artifacts: ReadonlyArray<CaseStudyArtifact>;
  evidenceSections: ReadonlyArray<CaseStudyEvidenceSection>;
  limitations: ReadonlyArray<string>;
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
  chapters: ReadonlyArray<CaseStudyChapter>;
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
        "One ongoing case study with a historical fixture proof, a live Gateproof dogfood proof, and a hardening chapter.",
      href: "/case-studies/cinder",
      iteration: "Ongoing",
    },
  ];
}

export interface LoadedExampleFiles {
  helloWorldPlan: string;
  rootPlan: string;
  cloudflareMinimalPlan: string;
  runloopWorkerPlan: string;
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

const resolveRepoRoot = (): string => {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(scriptsDir, ".."),
    path.resolve(scriptsDir, "..", ".."),
  ];

  for (const candidate of candidates) {
    if (
      existsSync(path.join(candidate, "plan.ts")) &&
      existsSync(path.join(candidate, "src", "index.ts")) &&
      existsSync(path.join(candidate, "demo"))
    ) {
      return candidate;
    }
  }

  return path.resolve(scriptsDir, "..");
};

const repoRoot = resolveRepoRoot();

const helloWorldPlanPath = path.join(repoRoot, "examples", "hello-world", "plan.ts");
const rootPlanPath = path.join(repoRoot, "plan.ts");
const cloudflareMinimalPlanPath = path.join(repoRoot, "examples", "cloudflare-minimal", "plan.ts");
const runloopWorkerPlanPath = path.join(repoRoot, "examples", "runloop-worker", "plan.ts");

const CINDER_START_REPO_URL = "https://github.com/acoyfellow/cinder-round-one-start";
const CINDER_END_REPO_URL = "https://github.com/acoyfellow/cinder-round-one-end";
const CINDER_DOGFOOD_COMMIT_URL = "https://github.com/acoyfellow/cinder/commit/1cd5460";
const CINDER_DOGFOOD_PLAN_URL = "https://github.com/acoyfellow/cinder/blob/1cd5460/plan.ts";
const CINDER_DOGFOOD_PROVISION_URL = "https://github.com/acoyfellow/cinder/blob/1cd5460/alchemy.run.ts";
const CINDER_HARDENING_COMMIT_URL = "https://github.com/acoyfellow/cinder/commit/36568ec";
const CINDER_HARDENING_PLAN_URL = "https://github.com/acoyfellow/cinder/blob/36568ec/plan.ts";

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

  return {
    helloWorldPlan: helloWorldPlan.code,
    rootPlan: rootPlan.code,
    cloudflareMinimalPlan: cloudflareMinimalPlan.code,
    runloopWorkerPlan: runloopWorkerPlan.code,
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

const getCinderCurrentRepoStatus = (
  _files: LoadedExampleFiles,
): CurrentRepoStatus => {
  return {
    label: "Current repo status",
    title: "Public proof artifacts are canonical; sibling workspaces are not build inputs",
    body:
      "The canonical witnesses for this page are the public repositories and workflow artifacts linked above. Gateproof's deployed case-study content is generated from Gateproof-owned source and public artifact links, not from a mutable sibling Cinder checkout on the runner.",
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

The Cinder case study is now one ongoing record with three chapters:

- Chapter 1 preserves the original historical Cargo-fixture proof.
- Chapter 2 proves that Cinder ran Gateproof's real docs deploy workflow on a self-hosted Cinder runner.
- Chapter 3 hardens that dogfood loop so stale queued runs and weak deploy smoke no longer hide the wrong outcome.

Public artifacts:

- Historical provisioning: ${CINDER_END_REPO_URL}/blob/main/alchemy.run.ts
- Historical proof contract: ${CINDER_END_REPO_URL}/blob/main/plan.ts
- Dogfood provisioning: ${CINDER_DOGFOOD_PROVISION_URL}
- Dogfood proof contract: ${CINDER_DOGFOOD_PLAN_URL}
- Hardening proof contract: ${CINDER_HARDENING_PLAN_URL}

Status: ${cinderStatus.title}

${cinderStatus.body}

## Roadmap

Gateproof is now dogfooding on a hardened Cinder loop in the case study. The next phase is no longer "can dogfooding work?" but "how far does the method generalize without losing proof quality?"

- Preserve the historical and current chapters without rewriting their claims after publication.
- Extend the same proof discipline to new repos only after onboarding, witnesses, and cleanup behavior stay boring on Gateproof.
- Keep finalize and publication tied to the last known green proof instead of ad hoc local state.
- Continue future Cinder chapters in the same case study instead of resetting the narrative.

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

Case records for Gateproof deployments. Each entry states the claim, method, preserved artifacts, and current reproducibility limits.

## 1. Cinder

One ongoing Gateproof case study with a preserved historical fixture chapter, a Gateproof dogfood chapter, and a hardening chapter. Historical provisioning lives in \`alchemy.run.ts\`; the preserved proof contract lives in \`plan.ts\`.

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
  const historicalArtifacts: ReadonlyArray<CaseStudyArtifact> = [
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
    },
    {
      label: "Provisioning",
      url: `${CINDER_END_REPO_URL}/blob/main/alchemy.run.ts`,
      note: "Historical alchemy.run.ts preserved as the provisioning artifact for the run record.",
    },
  ];
  const historicalEvidenceSections: ReadonlyArray<CaseStudyEvidenceSection> = [
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
      items: historicalArtifacts.map((artifact) => `${artifact.label}: ${artifact.note}`),
    },
    {
      title: "Proof contract notes",
      summary: "How the proof contract is framed in the historical record.",
      items: [
        "The proof contract is stored in plan.ts.",
        "The contract is described as defining observe, act, and assert conditions against the live system.",
        "The artifact is preserved for inspection and linked directly from this page.",
      ],
    },
    {
      title: "Provisioning notes",
      summary: "How the environment was provisioned for the historical run.",
      items: [
        "Provisioning is stored in alchemy.run.ts.",
        "The provisioning artifact is treated as a fixed historical input rather than a live deployment action on this page.",
        "The artifact is preserved for inspection and linked directly from this page.",
      ],
    },
  ];
  const dogfoodArtifacts: ReadonlyArray<CaseStudyArtifact> = [
    {
      label: "Cinder dogfood proof",
      url: CINDER_DOGFOOD_COMMIT_URL,
      note: "Public Cinder commit where the Gateproof dogfood proof is green from committed code.",
    },
    {
      label: "Cinder proof contract",
      url: CINDER_DOGFOOD_PLAN_URL,
      note: "Canonical Gateproof dogfood contract: webhook, queue, runner, and deploy-smoke against Gateproof.",
    },
    {
      label: "Cinder provisioning",
      url: CINDER_DOGFOOD_PROVISION_URL,
      note: "Existing-repo onboarding path that targets Gateproof without writing fixture files into the repo.",
    },
    {
      label: "Gateproof witness commit",
      url: "https://github.com/acoyfellow/gateproof/commit/ae39dc40f4f0dc109f6544a4d3f1dcbec715a6af",
      note: "Gateproof commit used as the witness repo under the green dogfood proof.",
    },
    {
      label: "Successful dogfood workflow run",
      url: "https://github.com/acoyfellow/gateproof/actions/runs/22772337017",
      note: "Real Gateproof CI run whose Deploy Demo Site job completed through Cinder.",
    },
  ];
  const dogfoodEvidenceSections: ReadonlyArray<CaseStudyEvidenceSection> = [
    {
      title: "Webhook delivery witness",
      summary: "GitHub's own webhook-delivery record was used as the webhook witness.",
      items: [
        "Gateproof CI was dispatched through workflow_dispatch on the real CI workflow.",
        "The proof checked the real workflow_job delivery history for the Gateproof webhook that targets Cinder.",
        "The green run recorded a successful workflow_job delivery with status_code 200 after dispatch.",
      ],
    },
    {
      title: "Execution-ready queue payload",
      summary: "Cinder exposed the queued Gateproof deploy job as an execution-ready payload.",
      items: [
        "The queue payload resolved repo_full_name as acoyfellow/gateproof.",
        "The payload included self-hosted and cinder labels.",
        "The payload included a real repo-scoped runner registration token for the Gateproof job.",
      ],
    },
    {
      title: "Runner execution",
      summary: "The local cinder-agent registered an ephemeral GitHub runner and executed the real deploy job.",
      items: [
        "The local agent logged starting github runner for the Gateproof deploy job.",
        "The agent configured a real ephemeral runner for acoyfellow/gateproof.",
        "The Deploy Demo Site job completed with result Succeeded on that runner.",
      ],
    },
    {
      title: "Deployed site smoke",
      summary: "The same workflow run ended with the production docs site returning HTTP 200.",
      items: [
        "The proof's deploy-smoke gate requested https://gateproof.dev after the deploy job completed.",
        "The smoke check returned HTTP 200 and captured the homepage HTML.",
        "The public witness run for this chapter is GitHub Actions run 22772337017.",
      ],
    },
  ];
  const hardeningArtifacts: ReadonlyArray<CaseStudyArtifact> = [
    {
      label: "Cinder hardening commit",
      url: CINDER_HARDENING_COMMIT_URL,
      note: "Public Cinder commit that makes stale queued Gateproof runs a control-plane concern instead of a manual cleanup step.",
    },
    {
      label: "Hardened Cinder proof contract",
      url: CINDER_HARDENING_PLAN_URL,
      note: "The hardened dogfood contract seeds a stale run, binds queue selection to the expected target run, proves exact runner/job identity, and smokes the real public routes.",
    },
    {
      label: "Gateproof smoke witness hardening",
      url: "https://github.com/acoyfellow/gateproof/commit/d48747b",
      note: "Gateproof's production smoke step now checks the homepage and the case-study routes that actually mattered in the failure.",
    },
    {
      label: "Successful hardened workflow run",
      url: "https://github.com/acoyfellow/gateproof/actions/runs/22776653080",
      note: "Real Gateproof CI run used as the green hardening witness after seeding stale queued runs.",
    },
  ];
  const hardeningEvidenceSections: ReadonlyArray<CaseStudyEvidenceSection> = [
    {
      title: "Seeded stale-run conditions",
      summary: "The hardened proof intentionally created a stale queued deploy run before dispatching the target run.",
      items: [
        "The proof dispatches one priming Gateproof CI run and then a second target run on the same branch and workflow.",
        "The proof records the exact expected target run_id and fails if the next runnable queue payload points at a different run.",
        "This removes manual GitHub queue cleanup from the operator path and turns stale-run handling into something the product must survive.",
      ],
    },
    {
      title: "Queue eviction and exact selection",
      summary: "Cinder now validates queued Gateproof jobs against GitHub and evicts stale or superseded ones before returning a runnable payload.",
      items: [
        "The orchestrator now checks queued job state against the real GitHub run and workflow state before serving /jobs/peek or /jobs/next.",
        "Stale jobs are explicitly skipped and evicted instead of relying on a human to cancel older runs in GitHub first.",
        "The hardened green proof selected the exact expected Gateproof deploy run rather than the primed stale run.",
      ],
    },
    {
      title: "Runner identity and production witness",
      summary: "The runner proof now binds the accepted job to the expected run_id and the production smoke covers the routes that actually failed.",
      items: [
        "The local cinder-agent logged the exact accepted Gateproof job_id, run_id, and repo identity before starting the runner.",
        "The runner witness required those exact log lines instead of inferring success from a generic completed workflow.",
        "The production smoke now checks /, /case-studies, and /case-studies/cinder so a healthy homepage no longer hides a broken case-study route.",
      ],
    },
  ];
  const chapters: ReadonlyArray<CaseStudyChapter> = [
    {
      id: "chapter-1",
      label: "Chapter 1: Historical fixture proof",
      status: "Historical completed study",
      primaryClaim:
        "A gate-defined proof loop was used to drive Cinder toward a state where the intended live checks passed.",
      methodSummary:
        "One historical run with preserved input and output repositories, fixed artifacts, and no mid-run human edits.",
      observedOutcome:
        "The historical record preserves a post-run repository, proof contract, and provisioning artifacts; this chapter reports that record rather than rerunning the live system.",
      artifacts: historicalArtifacts,
      evidenceSections: historicalEvidenceSections,
      limitations: [
        "This chapter does not execute a fresh live proof loop.",
        "The recorded outcome is interpreted from preserved artifacts and accompanying project notes.",
        "Reproduction still depends on external Cloudflare resources and environment secrets.",
        "The record concerns one system and one bounded historical study.",
      ],
    },
    {
      id: "chapter-2",
      label: "Chapter 2: Gateproof docs dogfood proof",
      status: "Current green proof",
      primaryClaim:
        "Cinder ran Gateproof's real docs deploy workflow on a self-hosted Cinder runner and the deployed site passed smoke.",
      methodSummary:
        "Provision Cinder against the existing Gateproof repo, dispatch the real CI workflow, observe the webhook and queue, run the deploy job through the local agent, and verify the deployed site.",
      observedOutcome:
        "From committed code, Cinder dispatched Gateproof CI, handled the workflow_job webhook, exposed an execution-ready queue payload, ran the real Deploy Demo Site job through the local cinder-agent, and observed a 200 smoke response from gateproof.dev.",
      artifacts: dogfoodArtifacts,
      evidenceSections: dogfoodEvidenceSections,
      limitations: [
        "This chapter proves the Gateproof docs deploy path, not every historical Cargo cache/speed claim from chapter one.",
        "A live rerun still requires Cloudflare infrastructure, GitHub access, and the Cinder environment secrets.",
        "The witness repo and workflow are real, but the proof is still scoped to one ongoing case study rather than a generalized benchmark suite.",
      ],
    },
    {
      id: "chapter-3",
      label: "Chapter 3: Hardening the Gateproof dogfood loop",
      status: "Current hardened green proof",
      primaryClaim:
        "Cinder can keep Gateproof's docs deploy proof green from a messy starting state by selecting the intended fresh run, preserving exact runner identity, and smoking the public case-study routes that actually matter.",
      methodSummary:
        "Seed a stale Gateproof run, dispatch a fresh target run, force the queue proof to bind to the exact target run_id, verify the exact job the agent accepted, and smoke the homepage plus the case-study routes after deploy.",
      observedOutcome:
        "From committed code, Cinder evicted stale queued Gateproof jobs, exposed the expected target payload, ran the exact intended Deploy Demo Site job through the local agent, and the hardened smoke witness passed on gateproof.dev, /case-studies, and /case-studies/cinder.",
      artifacts: hardeningArtifacts,
      evidenceSections: hardeningEvidenceSections,
      limitations: [
        "This chapter still hardens one witness repo and one deploy path rather than proving generalized multi-repo behavior.",
        "Live reruns still require Cloudflare infrastructure, GitHub access, and the Cinder environment secrets.",
        "The production smoke now covers the failed public routes, but it still validates one public site rather than every future witness route.",
      ],
    },
  ];

  return {
    title: "Cinder",
    description:
      "One ongoing Gateproof case study with a preserved historical fixture proof, a current Gateproof dogfood proof, and a hardened operator-ready dogfood chapter.",
    caseId: "cinder",
    studyLabel: "Ongoing case study",
    studyType: "Single-case historical + live dogfood record",
    temporalStatus: "Historical chapter preserved; dogfood and hardening chapters green",
    primaryClaim:
      "Gateproof can preserve an original historical proof chapter while extending the same Cinder case study into live dogfood and hardening chapters without rewriting the earlier record.",
    methodSummary:
      "Freeze completed chapters, then let the next truthful gate contract expose the next blocker until the live system earns a new green chapter.",
    observedOutcome:
      "This page now preserves the original fixture proof, the first Gateproof dogfood proof, and the hardened stale-run-safe dogfood proof as one continuous Cinder record.",
    abstract:
      "Cinder is now presented as one ongoing Gateproof case study. Chapter one preserves the original historical Cargo-fixture proof. Chapter two records the first green dogfood proof in which Cinder ran Gateproof's real docs deploy workflow on a self-hosted Cinder runner. Chapter three records the hardening work that made that same dogfood loop survive stale queued runs and stronger public smoke. The page keeps all three chapters visible without rewriting the earlier record.",
    historicalStatus:
      "The historical fixture chapter remains preserved, and the newer dogfood and hardening chapters are backed by real green workflow witnesses.",
    caseBoundary: [
      "System under study: Cinder on Cloudflare.",
      "Case structure: one preserved historical fixture chapter, one first green dogfood chapter, and one hardening chapter.",
      "Historical artifacts remain fixed and inspectable rather than reinterpreted.",
      "Current dogfood and hardening artifacts point at public repos and successful witness workflow runs.",
      "Out of scope for this page: turning every future proof into a separate standalone case-study route.",
    ],
    procedure: [
      "Freeze the historical chapter and keep its artifacts public.",
      "Promote the current proof contract to the next truthful claim rather than rewriting the old one.",
      "Run the live loop against the new claim until the first failing gate is honestly green.",
      "Publish the resulting proof artifacts before updating the public narrative.",
      "Present all earned chapters on one page so the case study reads as one continuous story.",
    ],
    findings: [
      "Chapter one remains preserved as the historical Cargo-fixture proof.",
      "Chapter two proves Gateproof's docs deploy through Cinder against the real Gateproof repo.",
      "Chapter three proves the same dogfood loop can survive stale queued runs and stronger route-level deploy smoke.",
      "The same case study can extend forward without rewriting the original proof chapters.",
      "Public artifact links now point at the museum-style historical record plus the live dogfood and hardening proofs.",
    ],
    limitations: [
      "This page summarizes three proof chapters but does not itself execute the live loop.",
      "The current dogfood and hardening chapters depend on public infra and secrets to reproduce live.",
      "Future chapters still need to be earned through the same proof-loop discipline rather than added narratively.",
    ],
    artifacts: [...historicalArtifacts, ...dogfoodArtifacts, ...hardeningArtifacts],
    evidenceSections: [
      ...historicalEvidenceSections,
      ...dogfoodEvidenceSections,
      ...hardeningEvidenceSections,
    ],
    chapters,
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
