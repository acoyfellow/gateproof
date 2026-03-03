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
}

export interface CinderCaseStudyContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  provisionLabel: string;
  provisionCode: string;
  planLabel: string;
  planCode: string;
  support: ReadonlyArray<string>;
  statusLabel: string;
  statusTitle: string;
  statusBody: string;
}

export interface LoadedExampleFiles {
  helloWorldPlan: string;
  rootPlan: string;
  cinderProvision: string;
  cinderPlan: string;
  cinderAvailable: boolean;
  missingCinderFiles: ReadonlyArray<string>;
}

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, "..");
const cinderRoot = path.resolve(repoRoot, "..", "cinder");

const helloWorldPlanPath = path.join(repoRoot, "examples", "hello-world", "plan.ts");
const rootPlanPath = path.join(repoRoot, "plan.ts");
const cinderProvisionPath = path.join(cinderRoot, "alchemy.run.ts");
const cinderPlanPath = path.join(cinderRoot, "plan.ts");

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

export function loadExampleFiles(): LoadedExampleFiles {
  const helloWorldPlan = readSourceFile(helloWorldPlanPath, "The hello-world example");
  const rootPlan = readSourceFile(rootPlanPath, "The root plan");
  const cinderProvision = readSourceFile(cinderProvisionPath, "The Cinder provision file");
  const cinderPlan = readSourceFile(cinderPlanPath, "The Cinder proof file");

  const missingCinderFiles = [
    !cinderProvision.available ? cinderProvisionPath : null,
    !cinderPlan.available ? cinderPlanPath : null,
  ].filter((filePath): filePath is string => filePath !== null);

  return {
    helloWorldPlan: helloWorldPlan.code,
    rootPlan: rootPlan.code,
    cinderProvision: cinderProvision.code,
    cinderPlan: cinderPlan.code,
    cinderAvailable: missingCinderFiles.length === 0,
    missingCinderFiles,
  };
}

export function getHelloWorldSnippet(): string {
  return loadExampleFiles().helloWorldPlan;
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

export function renderDocsContent(scope: ScopeFile): Record<string, string> {
  const files = loadExampleFiles();
  const canonicalGoals = getCanonicalGoals(scope);
  const cinderStatus = getCinderStatus(files);

  return {
    "tutorials/first-gate": `# Tutorial: Your First Gate

Start with one tiny proof file.

\`\`\`ts
${files.helloWorldPlan}
\`\`\`

This example is intentionally unimpressive. It is still a full Gateproof run: one file, one gate, one worker loop, one real pass condition.`,
    "how-to/run-in-a-loop": `# How To: Prove The Live System

Task: ${scope.spec.howTo.task}

Done when: ${scope.spec.howTo.done}

## What the runtime does

- runs the proof once
- selects the first failing gate
- sends in the worker for one bounded attempt
- commits the attempt
- reruns until the live claim is green or the loop stops

## Why two files

- \`alchemy.run.ts\` provisions infrastructure once
- \`plan.ts\` reruns the proof loop against the live deployment
- the loop should never rebuild infrastructure on every iteration

## Gates that matter

${canonicalGoals.map((goal) => `- ${goal}`).join("\n")}`,
    "reference/api": `# Reference: API

The Cinder proof loop only needs a small public surface.

${apiList.map((entry) => `- ${entry}`).join("\n")}

## Cinder files

\`\`\`ts
${files.cinderProvision}
\`\`\`

\`\`\`ts
${files.cinderPlan}
\`\`\`

Status: ${cinderStatus.statusTitle}

${cinderStatus.statusBody}`,
    "explanations/one-file-handoff": `# Explanation: One Proof File, One Provision File

${scope.spec.explanation.summary}

## Why the split matters

- provisioning and proof have different lifecycles
- Alchemy is idempotent, but it should still run once
- the proof loop should only answer one question: is the live product actually green?

## Why Cinder is the center

The core claim is not that a worker deployed. The core claim is that a warm build is materially faster than cold. Gateproof exists to make that claim executable and explicit.`,
  };
}

export function getHomepageContent(): HomepageContent {
  return {
    eyebrow: "Gateproof",
    headline: "Point Gateproof at plan.ts.",
    subheadline:
      "The loop runs the proof, sends in the worker, commits the attempt, and keeps going until the live system actually earns the gate.",
    snippetLabel: "Hello World",
    snippetTitle: "One complete proof file",
    snippetBody:
      "Small on purpose. Complete on purpose. One file, one gate, one worker loop, one real pass condition.",
    snippetCode: getHelloWorldSnippet(),
    principles: [
      {
        title: "Start with the green state",
        body:
          "A gate is the finished behavior before the code deserves to exist. The loop keeps reality pinned to that target.",
      },
      {
        title: "Provision once, prove often",
        body:
          "Provisioning and proof have different lifecycles. Rebuild the world when infra changes. Rerun the proof file when behavior changes.",
      },
      {
        title: "One contract for the worker",
        body:
          "The same file the human reads is the file the loop hands to the worker. The worker gets one failing gate, one bounded attempt, and the loop reruns.",
      },
    ],
    ctaEyebrow: "First Case Study",
    ctaTitle: "Cinder",
    ctaBody:
      "The first real case study is not another toy. Provision the world once, then keep proving the live warm-build claim until it is actually true.",
    ctaHref: "/cinder",
    ctaLabel: "Read the Cinder case study",
  };
}

export function getCinderCaseStudyContent(): CinderCaseStudyContent {
  const files = loadExampleFiles();
  const status = getCinderStatus(files);

  return {
    eyebrow: "First Case Study",
    headline: "Read one file. Prove one claim.",
    subheadline:
      "Gateproof is the proof loop between a live system and the one claim that makes the product real. In Cinder, the loop can keep sending in the worker until the live warm-build speed claim is true.",
    provisionLabel: "alchemy.run.ts (the world)",
    provisionCode: files.cinderProvision,
    planLabel: "plan.ts (the contract)",
    planCode: files.cinderPlan,
    support: [
      "Run alchemy.run.ts only when the world itself changes.",
      "Run plan.ts directly or let Gateproof keep handing the same contract to the worker after every failed proof.",
      "The loop is not green because code deployed. It is green because the live claim held.",
    ],
    ...status,
  };
}

export function getFrontdoorContent(_scope?: ScopeFile): CinderCaseStudyContent {
  return getCinderCaseStudyContent();
}
