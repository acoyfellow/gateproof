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
        "One ongoing case study with three earned chapters. Today Cloudflare hosts the control plane, and a separate runner machine still does the compute.",
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
const CINDER_PROOF_RUN_COMMIT_URL = "https://github.com/acoyfellow/cinder/commit/de26df3";
const CINDER_PROOF_RUN_PLAN_URL = "https://github.com/acoyfellow/cinder/blob/de26df3/plan.ts";
const GATEPROOF_WORKER_LOOP_COMMIT_URL =
  "https://github.com/acoyfellow/gateproof/commit/8326307396cd131154af4dc39b715bc410713f5b";
const GATEPROOF_PROOF_RUN_WITNESS_URL =
  "https://github.com/acoyfellow/gateproof/actions/runs/22869731418";
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
const FILEPATH_ALPHA_SNIPPET = trimSource(`bun run example:hello-world:filepath-worker

# Gateproof runs the proof locally.
# filepath runs the bounded worker task.
# filepath returns a unified patch.
# Gateproof applies the patch locally and reruns proof.`);

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
    title: "This page is built from public proof links, not a local Cinder checkout",
    body:
      "This page is built from Gateproof-owned source and the public repo and workflow links above. It does not read a nearby Cinder checkout at deploy time, so the public page stays stable and reproducible.",
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

Gateproof runs the proof locally from \`plan.ts\`. The built-in worker loop is the stable demo path, and the filepath-backed worker is a real hello-world alpha witness rather than the default public runtime.

## Tutorial

Goal: Start with one tiny gate that is small on purpose and complete on purpose.

### examples/hello-world/plan.ts

\`\`\`ts
${files.helloWorldPlan}
\`\`\`

Outcome: The loop only passes when the live response says hello world.

## Worker Paths

- \`bun run example:hello-world:worker\` — stable built-in worker demo path
- \`bun run example:hello-world:filepath-worker\` — real filepath-backed alpha witness on the hello-world loop

## First Case Study: Cinder

The Cinder case study is now one ongoing record with three earned chapters:

- Chapter 1 preserves the original historical Cargo-fixture proof.
- Chapter 2 proves that Cinder ran Gateproof's real docs deploy workflow through a Cloudflare control plane and onto a separate runner machine.
- Chapter 3 proves that Cinder can start and report proof runs for a connected repo through its own product path while still using that same machine-backed execution path.

Current truth: Cinder's control plane is on Cloudflare, but the compute still runs on a separate machine today. Hosted runner capacity in the user's Cloudflare account is the next claim, not an earned one yet.

Public artifacts:

- Historical provisioning: ${CINDER_END_REPO_URL}/blob/main/alchemy.run.ts
- Historical proof contract: ${CINDER_END_REPO_URL}/blob/main/plan.ts
- Dogfood provisioning: ${CINDER_DOGFOOD_PROVISION_URL}
- Dogfood proof contract: ${CINDER_DOGFOOD_PLAN_URL}
- Proof-run chapter commit: ${CINDER_PROOF_RUN_COMMIT_URL}
- Proof-run chapter contract: ${CINDER_PROOF_RUN_PLAN_URL}

Status: ${cinderStatus.title}

${cinderStatus.body}

## Roadmap

Gateproof is now dogfooding on Cinder through a connected-repo proof-run path. The next phase is to make that path work across more than one repo without losing proof quality.

- Preserve the historical and current chapters without rewriting their claims after publication.
- Extend the same product path from one connected repo to two connected repos.
- Keep finalize and publication tied to the last known green proof instead of ad hoc local state.
- Continue future Cinder chapters in the same case study instead of resetting the narrative.

## How To

Task: ${scope.spec.howTo.task}

Done when: ${scope.spec.howTo.done}

Run it:

\`\`\`bash
bun run example:hello-world
bun run example:hello-world:worker
bun run example:hello-world:filepath-worker
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
3. Use one bounded worker path for one bounded attempt.
4. Commit the attempt.
5. Rerun until the live claim is green or the loop stops.

## Gates that matter

${canonicalGoals.map((g) => `- ${g}`).join("\n")}

## Worker paths

- Built-in worker: stable demo path for Gateproof itself.
- filepath worker: real alpha witness for the hello-world loop; Gateproof still owns proof, scope validation, and commits locally.`,
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

One ongoing Gateproof case study with a preserved historical fixture chapter and a Gateproof dogfood chapter. Historical provisioning lives in \`alchemy.run.ts\`; the preserved proof contract lives in \`plan.ts\`.

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
        title: "Use one worker path at a time",
        body:
          "The built-in worker is the stable demo path. filepath is a separate runtime alpha that returns a patch for Gateproof to apply locally.",
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
      note: "Canonical Gateproof product-path contract: repo connect, repo list, repo status, repo dispatch, webhook, queue, runner, and deploy-smoke against Gateproof.",
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
      summary: "The proof used GitHub's own webhook delivery record to show that Cinder received the job event.",
      items: [
        "Gateproof CI was dispatched through workflow_dispatch on the real CI workflow.",
        "The proof checked the real workflow_job delivery history for the Gateproof webhook that points at Cinder.",
        "The green run recorded a successful workflow_job delivery with status_code 200 after dispatch.",
      ],
    },
    {
      title: "Queue payload",
      summary: "After dispatch, Cinder returned the exact Gateproof deploy job the agent was supposed to run.",
      items: [
        "Cinder connected Gateproof before dispatch.",
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
      summary: "The same workflow run ended with the public docs site returning HTTP 200.",
      items: [
        "The proof's deploy-smoke gate requested https://gateproof.dev after the deploy job completed.",
        "The smoke check returned HTTP 200 and captured the homepage HTML.",
        "The public witness run for this chapter is GitHub Actions run 22772337017.",
      ],
    },
  ];
  const proofRunArtifacts: ReadonlyArray<CaseStudyArtifact> = [
    {
      label: "Cinder proof-run chapter",
      url: CINDER_PROOF_RUN_COMMIT_URL,
      note: "Public Cinder commit where repo proof runs became part of the connected-repo product path.",
    },
    {
      label: "Cinder proof-run contract",
      url: CINDER_PROOF_RUN_PLAN_URL,
      note: "Canonical proof contract including repo connect, repo list, repo status, repo dispatch, repo proof run, webhook, queue, runner, and deploy-smoke.",
    },
    {
      label: "Gateproof worker-loop foundation",
      url: GATEPROOF_WORKER_LOOP_COMMIT_URL,
      note: "Gateproof commit that provided the reusable self-fixing worker-loop substrate consumed by this chapter.",
    },
    {
      label: "Successful proof-run witness",
      url: GATEPROOF_PROOF_RUN_WITNESS_URL,
      note: "Real Gateproof CI run whose Deploy Demo Site job completed during the proof-run chapter.",
    },
  ];
  const proofRunEvidenceSections: ReadonlyArray<CaseStudyEvidenceSection> = [
    {
      title: "Proof-run API",
      summary: "Cinder added its own proof-run API for the connected Gateproof repo.",
      items: [
        "The CLI added cinder repo prove acoyfellow/gateproof.",
        "Cinder returned a proof_run_id, repo, triggered_run_id, status, and timestamps through its own HTTP API.",
        "The proof fetched the same proof-run record back from GET /proof-runs/:id and used that as the direct check.",
      ],
    },
    {
      title: "Earlier repo steps still worked",
      summary: "Adding proof runs did not break the repo connection work that Cinder had already earned.",
      items: [
        "Repo connect was still the way Gateproof entered Cinder state.",
        "Repo list and repo status still showed that the connected repo was visible and inspectable.",
        "Repo dispatch still triggered the real Gateproof workflow before the proof-run record was created.",
      ],
    },
    {
      title: "The runtime still passed",
      summary: "This chapter only counted because the old runtime checks still passed after proof runs were added.",
      items: [
        "The webhook gate still observed the real workflow_job delivery after dispatch.",
        "The queue gate still observed the intended self-hosted Gateproof deploy job with the runner details already filled in.",
        "The runner and deploy-smoke gates still ended on a successful Deploy Demo Site job and 200 responses from the public routes.",
      ],
    },
  ];
  const chapters: ReadonlyArray<CaseStudyChapter> = [
    {
      id: "chapter-1",
      label: "Chapter 1: Historical fixture proof",
      status: "Historical completed study",
      primaryClaim:
        "Cinder was first built through a proof loop that kept running until the target checks passed.",
      methodSummary:
        "One historical run with preserved input and output repos, fixed artifacts, and no mid-run human edits.",
      observedOutcome:
        "This chapter reports a preserved record of the repo, proof file, and provisioning artifacts instead of rerunning the old system live.",
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
      status: "Completed live proof",
      primaryClaim:
        "Cinder connected Gateproof through its own CLI, started the real docs deploy workflow, sent it through Cinder's Cloudflare control plane, ran it on a separate runner machine, and the deployed site passed smoke.",
      methodSummary:
        "Deploy Cinder, connect Gateproof, list and inspect the repo through Cinder, dispatch the real CI workflow, watch the webhook and queue, let a separate machine running cinder-agent pick up the deploy job, and verify the deployed site.",
      observedOutcome:
        "From committed code, Cinder connected Gateproof, listed and inspected the repo, dispatched Gateproof CI, handled the workflow_job webhook, returned the queued deploy job with runner details, ran the real Deploy Demo Site job through a separate machine running cinder-agent, and got a 200 smoke response from gateproof.dev.",
      artifacts: dogfoodArtifacts,
      evidenceSections: dogfoodEvidenceSections,
      limitations: [
        "This chapter proves the Gateproof docs deploy path, not every historical Cargo cache/speed claim from chapter one.",
        "A live rerun still requires Cloudflare infrastructure, GitHub access, and the Cinder environment secrets.",
        "Cloudflare hosted the control plane here, but compute still ran on a separate runner machine.",
        "The witness repo and workflow are real, but the proof is still scoped to one ongoing case study rather than a generalized benchmark suite.",
        "Repo proof runs are not part of this chapter's claim; they were earned in the following chapter.",
      ],
    },
    {
      id: "chapter-3",
      label: "Chapter 3: Connected repo proof runs",
      status: "Current green proof",
      primaryClaim:
        "Cinder can start a proof run for a connected repo and show that proof run back to the user, while the old Gateproof runtime checks still pass on the same separate runner machine.",
      methodSummary:
        "Connect Gateproof through Cinder, list and inspect the repo, dispatch the real workflow through Cinder, start a proof run for that repo, then require webhook, queue, runner, and deploy-smoke to stay green on the same machine-backed execution path.",
      observedOutcome:
        "From committed code, Cinder created a proof-run record for the connected Gateproof repo through its own CLI and HTTP API, returned that record through GET /proof-runs/:id, and still drove the real Gateproof Deploy Demo Site job through the separate cinder-agent machine to a successful smoke-checked deploy.",
      artifacts: proofRunArtifacts,
      evidenceSections: proofRunEvidenceSections,
      limitations: [
        "This chapter is still scoped to one connected repo at a time.",
        "A live rerun still requires Cloudflare infrastructure, GitHub access, and the Cinder environment secrets.",
        "The compute still runs on a separate runner machine; hosted execution in the user's Cloudflare account is next work, not part of this earned claim.",
        "Multi-repo onboarding, repo isolation, stale-run recovery, and agent fleet behavior are later chapters.",
      ],
    },
  ];

  return {
    title: "Cinder",
    description:
      "One ongoing Gateproof case study with a preserved historical chapter, a live dogfood chapter, and a current proof-run chapter. Today Cloudflare hosts the control plane, and a separate runner machine still does the compute.",
    caseId: "cinder",
    studyLabel: "Ongoing case study",
    studyType: "Single-case historical + live dogfood record",
    temporalStatus: "Historical chapter preserved; proof-run chapter is green",
    primaryClaim:
      "Gateproof can keep the original Cinder chapter intact while adding new live chapters on top of it without rewriting the old record, while still stating plainly that current Cinder compute runs on a separate machine.",
    methodSummary:
      "Freeze each completed chapter, then tighten the next claim until the live system earns the next green chapter.",
    observedOutcome:
      "This page now shows the original fixture proof, the first real Gateproof dogfood proof, and the connected-repo proof-run chapter as one continuous Cinder story, and it says clearly that hosted compute is still next work.",
    abstract:
      "Cinder is one ongoing Gateproof case study. Chapter one preserves the original historical Cargo fixture proof. Chapter two records the first green proof where Cinder connected Gateproof, ran Gateproof's real docs deploy workflow through Cinder's Cloudflare control plane and onto a separate runner machine, and verified the deployed site. Chapter three records the next step: Cinder can now start and report proof runs for that connected repo while keeping the same machine-backed runtime checks green. The page keeps all earned chapters visible without rewriting the earlier record, and it states plainly that hosted execution is still next work.",
    historicalStatus:
      "The historical fixture chapter remains preserved, and the current proof-run chapter is backed by a real green workflow run on the old machine-backed execution path.",
    caseBoundary: [
      "System under study: Cinder on Cloudflare.",
      "Case structure: one preserved historical fixture chapter, one live dogfood chapter, and one current proof-run chapter.",
      "Current compute model: Cloudflare control plane plus a separate runner machine.",
      "Historical artifacts remain fixed and inspectable rather than reinterpreted.",
      "Current proof-run artifacts point at public repos and a successful witness workflow run.",
      "Out of scope for this page: turning every future proof into a separate standalone case-study route.",
    ],
    procedure: [
      "Freeze the historical chapter and keep its artifacts public.",
      "Promote the current proof contract to the next truthful claim rather than rewriting the old one.",
      "Run the live loop against the new claim until the first failing gate is honestly green.",
      "Publish the resulting proof artifacts before updating the public narrative.",
      "Present the earned chapters on one page so the case study reads as one continuous story.",
    ],
    findings: [
      "Chapter one remains preserved as the historical Cargo-fixture proof.",
      "Chapter two proves Gateproof's docs deploy through Cinder against the real Gateproof repo using Cinder's own repo connect, list, status, and dispatch path.",
      "Chapter three proves Cinder can start and report proof runs for a connected repo through its own API and CLI.",
      "Current public truth is now explicit: Cinder still uses a separate runner machine for compute today.",
      "The same case study can extend forward without rewriting the original proof chapters.",
      "Public artifact links now point at the museum-style historical record plus the live dogfood proof.",
    ],
    limitations: [
      "This page summarizes three proof chapters but does not itself execute the live loop.",
      "The current proof-run chapter depends on public infra and secrets to reproduce live.",
      "Hosted runner capacity in the user's Cloudflare account is not an earned claim on this page yet.",
      "Future chapters still need to be earned through the same proof-loop discipline rather than added narratively.",
    ],
    artifacts: [...historicalArtifacts, ...dogfoodArtifacts, ...proofRunArtifacts],
    evidenceSections: [...historicalEvidenceSections, ...dogfoodEvidenceSections, ...proofRunEvidenceSections],
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
      tab: "Built-in loop",
      title: "Plan.runLoop with built-in worker",
      description: "The stable demo path: first failing gate, one bounded built-in worker attempt, rerun.",
      language: "typescript",
      code: files.runloopWorkerPlan,
    },
    {
      id: "filepath-alpha",
      tab: "filepath alpha",
      title: "filepath worker alpha",
      description: "Gateproof stays local. filepath runs one bounded worker task, returns a patch, and Gateproof reruns proof after applying it.",
      language: "bash",
      code: FILEPATH_ALPHA_SNIPPET,
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
