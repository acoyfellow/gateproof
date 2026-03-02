import type { PlanDefinition, ScopeFile } from "../src/index";

export interface RenderReadmeOptions {
  fileName?: string;
  runCommand?: string;
}

export interface FrontdoorStep {
  label: string;
  mode: "direct" | "attached";
  title: string;
  proves: string;
  changed: string;
  fileName: string;
  code: string;
}

export interface FrontdoorContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  steps: FrontdoorStep[];
}

const apiList = [
  "`Gate.define(...)`",
  "`Plan.define(...)`",
  "`Plan.run(...)`",
  "`Plan.runLoop(...)`",
];

const indent = (value: string, spaces = 2): string => {
  const prefix = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
};

const renderInlineString = (value: string): string => JSON.stringify(value);

const renderField = (label: string, value: string): string => {
  const [firstLine, ...rest] = value.split("\n");
  const continuation = "  ";

  return [
    `${label}: ${firstLine ?? ""}`,
    ...rest.map((line) => `${continuation}${line}`),
  ].join("\n");
};

const renderObserve = (plan: PlanDefinition): string => {
  const gate = plan.goals[0]?.gate;
  if (gate?.observe?.kind === "http") {
    return `createHttpObserveResource({
  url: "${gate.observe.url}",
  pollInterval: ${gate.observe.pollInterval ?? 250},
})`;
  }

  return `createHttpObserveResource({
  url: "http://127.0.0.1:3000/health",
  pollInterval: 250,
})`;
};

const renderActions = (plan: PlanDefinition): string => {
  const actions = plan.goals[0]?.gate.act ?? [];
  if (actions.length === 0) {
    return "[]";
  }

  return `[
${actions
  .map((action) => `  Act.exec(\n    ${renderInlineString(action.command)},\n  )`)
  .join(",\n")}
]`;
};

const renderAssertions = (plan: PlanDefinition): string => {
  const assertions = plan.goals[0]?.gate.assert ?? [];
  if (assertions.length === 0) {
    return "[]";
  }

  return `[
${assertions
    .map((assertion) => {
      if (assertion.kind === "httpResponse") {
        const parts = [
          assertion.actionIncludes
            ? `    actionIncludes: ${JSON.stringify(assertion.actionIncludes)},`
            : null,
          `    status: ${assertion.status},`,
        ].filter(Boolean);
        return `  Assert.httpResponse({
${parts.join("\n")}
  })`;
      }

      if (assertion.kind === "duration") {
        const parts = [
          assertion.actionIncludes
            ? `    actionIncludes: ${JSON.stringify(assertion.actionIncludes)},`
            : null,
          `    atMostMs: ${assertion.atMostMs},`,
        ].filter(Boolean);
        return `  Assert.duration({
${parts.join("\n")}
  })`;
      }

      return "  Assert.noErrors()";
    })
    .join(",\n")}
]`;
};

export function renderPlanSnippet(
  plan: PlanDefinition,
  options: { fileName?: string } = {}
): string {
  const fileName = options.fileName ?? "plan.ts";
  const firstGoal = plan.goals[0];
  const loopMax = plan.loop?.maxIterations ?? 5;

  return `const scope = {
  plan: Plan.define({
    goals: [
      {
        id: "${firstGoal?.id ?? "health"}",
        title: "${firstGoal?.title ?? "GET /health returns 200"}",
        gate: Gate.define({
${indent(renderField("observe", renderObserve(plan)), 10)},
${indent(renderField("act", renderActions(plan)), 10)},
${indent(renderField("assert", renderAssertions(plan)), 10)},
        }),
      },
    ],
    loop: {
      maxIterations: ${loopMax},
    },
  }),
};

await Effect.runPromise(
  Plan.runLoop(scope.plan, {
    maxIterations: ${loopMax},
  }),
);

// ${fileName}`;
}

export function renderScopeSnippet(scope: ScopeFile, options: { fileName?: string } = {}): string {
  const fileName = options.fileName ?? "plan.ts";
  const firstGoal = scope.plan.goals[0];
  const loopMax = scope.plan.loop?.maxIterations ?? 5;

  return `import { Effect } from "effect";
import {
  Act,
  Assert,
  Gate,
  Plan,
  createHttpObserveResource,
  type ScopeFile,
} from "gateproof";

const scope = {
  spec: {
    title: ${JSON.stringify(scope.spec.title)},
    tutorial: {
      goal: ${JSON.stringify(scope.spec.tutorial.goal)},
      outcome: ${JSON.stringify(scope.spec.tutorial.outcome)},
    },
    howTo: {
      task: ${JSON.stringify(scope.spec.howTo.task)},
      done: ${JSON.stringify(scope.spec.howTo.done)},
    },
    explanation: {
      summary: ${JSON.stringify(scope.spec.explanation.summary)},
    },
  },
  plan: Plan.define({
    goals: [
      {
        id: "${firstGoal?.id ?? "health"}",
        title: "${firstGoal?.title ?? "GET /health returns 200"}",
        gate: Gate.define({
${indent(renderField("observe", renderObserve(scope.plan)), 10)},
${indent(renderField("act", renderActions(scope.plan)), 10)},
${indent(renderField("assert", renderAssertions(scope.plan)), 10)},
        }),
      },
    ],
    loop: {
      maxIterations: ${loopMax},
    },
  }),
} satisfies ScopeFile;

export default scope;

if (import.meta.main) {
  const result = await Effect.runPromise(
    Plan.runLoop(scope.plan, {
      maxIterations: ${loopMax},
    }),
  );

  console.log(JSON.stringify(result, null, 2));

  if (result.status !== "pass") {
    process.exitCode = 1;
  }
}

// ${fileName}`;
}

export function renderReadme(
  scope: ScopeFile,
  options: RenderReadmeOptions = {}
): string {
  const fileName = options.fileName ?? "plan.ts";
  const runCommand = options.runCommand ?? `bun run ${fileName}`;
  const goalLines = scope.plan.goals.map((goal) => `- ${goal.title}`).join("\n");
  const loopLines = scope.plan.loop?.maxIterations
    ? `Loop:\n- maxIterations: ${scope.plan.loop.maxIterations}`
    : "Loop:\n- uses runtime defaults";

  return `# ${scope.spec.title}

${scope.spec.howTo.task}

## Tutorial

Goal: ${scope.spec.tutorial.goal}

\`\`\`ts
${renderScopeSnippet(scope, { fileName })}
\`\`\`

Outcome: ${scope.spec.tutorial.outcome}

## How To

Task: ${scope.spec.howTo.task}

Done when: ${scope.spec.howTo.done}

Run it:

\`\`\`bash
${runCommand}
\`\`\`

## Breaking Changes In 0.4.0

- \`Prd.*\` is gone
- \`Claim.*\` is gone
- \`plan.ts\` is the canonical entrypoint
- \`Plan.*\` replaces the old front door

## Reference

File: \`${fileName}\`

Goals:
${goalLines}

${loopLines}

Core API:
${apiList.map((entry) => `- ${entry}`).join("\n")}

## Explanation

${scope.spec.explanation.summary}
`;
}

export function renderDocsContent(scope: ScopeFile): Record<string, string> {
  const planSnippet = renderScopeSnippet(scope, { fileName: "plan.ts" });
  const planReference = renderPlanSnippet(scope.plan, { fileName: "plan.ts" });
  const goalList = scope.plan.goals.map((goal) => `- \`${goal.id}\`: ${goal.title}`).join("\n");
  const loopSection = scope.plan.loop?.maxIterations
    ? `- maxIterations: \`${scope.plan.loop.maxIterations}\``
    : "- loop settings are omitted until you need them";

  return {
    "tutorials/first-gate": `# Tutorial: Your First Gate

Goal: ${scope.spec.tutorial.goal}

This is the shortest possible path: one file, one handoff, one loop.

## plan.ts

\`\`\`ts
${planSnippet}
\`\`\`

## Run it

\`\`\`bash
bun run plan.ts
\`\`\`

## Outcome

${scope.spec.tutorial.outcome}`,
    "how-to/run-in-a-loop": `# How To: Run In A Loop

Task: ${scope.spec.howTo.task}

Done when: ${scope.spec.howTo.done}

## What changes from a single run

- The file stays the same
- The runtime keeps rerunning until the gate passes or the run stops
- If you provide an agent, it is called between failed iterations

## The executable shape

\`\`\`ts
${planReference}
\`\`\`

## Notes

- \`Effect.runPromise(...)\` stays at the edge
- \`Plan.runLoop(...)\` is the runtime entrypoint for repeated work`,
    "reference/api": `# Reference: API

## ScopeFile

\`\`\`ts
type ScopeFile = {
  spec: SpecDefinition;
  plan: PlanDefinition;
};
\`\`\`

## SpecDefinition

\`\`\`ts
type SpecDefinition = {
  title: string;
  tutorial: { goal: string; outcome: string };
  howTo: { task: string; done: string };
  explanation: { summary: string };
};
\`\`\`

## PlanDefinition

\`\`\`ts
type PlanDefinition = {
  goals: readonly PlanGoal[];
  loop?: { maxIterations?: number; stopOnFailure?: boolean };
};
\`\`\`

## PlanGoal

${goalList}

## Loop

${loopSection}

## Core API

${apiList.map((entry) => `- ${entry}`).join("\n")}

## Statuses

- \`pass\`
- \`fail\`
- \`skip\`
- \`inconclusive\``,
    "explanations/one-file-handoff": `# Explanation: One File Handoff

${scope.spec.explanation.summary}

## Why it is one file

- \`spec\` carries the human framing
- \`plan\` carries the executable truth
- the runtime reads \`scope.plan\`
- the README, homepage, and docs are rendered from the same source

## What stays out of spec

- gate counts
- gate titles copied from the plan
- loop settings
- agent settings
- duplicated machine truth

That keeps drift low while preserving a single handoff artifact.`
  };
}

export function getFrontdoorContent(scope: ScopeFile): {
  eyebrow: string;
  headline: string;
  subheadline: string;
  steps: FrontdoorStep[];
} {
  const attachedCode = `// worker.ts
export default {
  async fetch(): Promise<Response> {
    return new Response("not ready", {
      status: 500,
    });
  },
};

// server.ts
import worker from "./worker";

export const server = Bun.serve({
  port: 8787,
  fetch(request) {
    return worker.fetch(request);
  },
});

// plan.ts
import { Effect } from "effect";
import {
  Act,
  Assert,
  Gate,
  Plan,
  createHttpObserveResource,
} from "gateproof";

const scope = {
  plan: Plan.define({
    goals: [
      {
        id: "hello-local",
        title: "Local worker returns hello world",
        gate: Gate.define({
          observe: createHttpObserveResource({
            url: "http://127.0.0.1:8787",
          }),
          act: [
            Act.exec(
              'curl -fsS http://127.0.0.1:8787 | grep -q "hello world"',
            ),
          ],
          assert: [
            Assert.httpResponse({
              status: 200,
            }),
            Assert.noErrors(),
          ],
        }),
      },
    ],
  }),
};

await Effect.runPromise(
  Plan.runLoop(scope.plan, {
    maxIterations: 5,
    agent: async ({ failedGoals }) => {
      // attached mode:
      // fix worker.ts until the gate passes
      console.log(failedGoals[0]?.summary);
    },
  }),
);`;

  const edgeCode = `// alchemy.run.ts (run once)
import alchemy from "alchemy";
import { Worker } from "alchemy/cloudflare";

const app = await alchemy("hello-edge");

export const worker = await Worker("hello-edge", {
  entrypoint: "./worker.ts",
});

await app.finalize();

// worker.ts
export default {
  async fetch(): Promise<Response> {
    return new Response("hello world");
  },
};

// plan.ts (reruns)
import { Effect } from "effect";
import {
  Act,
  Assert,
  Gate,
  Plan,
  createHttpObserveResource,
} from "gateproof";
import { worker } from "./alchemy.run";

const scope = {
  plan: Plan.define({
    goals: [
      {
        id: "hello-edge",
        title: "A tiny worker returns hello world",
        gate: Gate.define({
          observe:
            createHttpObserveResource({
              url: worker.url,
            }),
          act: [
            Act.exec(
              \`curl -fsS \${worker.url} | grep -q "hello world"\`,
            ),
          ],
          assert: [
            Assert.httpResponse({
              status: 200,
            }),
            Assert.noErrors(),
          ],
        }),
      },
    ],
  }),
};

await Effect.runPromise(Plan.runLoop(scope.plan));`;

  const workerCode = `// alchemy.run.ts (run once)
import alchemy from "alchemy";
import { Worker } from "alchemy/cloudflare";

const app = await alchemy("hello-worker");

export const worker = await Worker("hello-worker", {
  entrypoint: "./worker.ts",
});

await app.finalize();

// worker.ts
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("not ready", 500));

export default app;

// plan.ts (reruns)
import { Effect } from "effect";
import {
  Act,
  Assert,
  Gate,
  Plan,
  createHttpObserveResource,
} from "gateproof";
import { worker } from "./alchemy.run";

const scope = {
  plan: Plan.define({
    goals: [
      {
        id: "hello-worker",
        title: "Hono worker returns hello world",
        gate: Gate.define({
          observe:
            createHttpObserveResource({
              url: worker.url,
            }),
          act: [
            Act.exec(
              \`curl -fsS \${worker.url} | grep -q "hello world"\`,
            ),
          ],
          assert: [
            Assert.httpResponse({
              status: 200,
            }),
            Assert.noErrors(),
          ],
        }),
      },
    ],
  }),
};

await Effect.runPromise(
  Plan.runLoop(scope.plan, {
    maxIterations: 8,
    agent: async ({ failedGoals }) => {
      // fix worker.ts until the live worker returns
      // "hello world" with a 200
      console.log(failedGoals[0]?.summary);
    },
  }),
);`;

  const starterCode = `import { Effect } from "effect";
import {
  Act,
  Assert,
  Gate,
  Plan,
  createHttpObserveResource,
} from "gateproof";

const scope = {
  plan: Plan.define({
    goals: [
      {
        id: "signup",
        title: "A user can sign up",
        gate: Gate.define({
          observe:
            createHttpObserveResource({
              url: "http://127.0.0.1:3000/signup",
            }),
          act: [
            Act.exec(
              'curl -fsS -X POST http://127.0.0.1:3000/signup',
            ),
          ],
          assert: [
            Assert.httpResponse({
              status: 200,
            }),
            Assert.noErrors(),
          ],
        }),
      },
      {
        id: "org",
        title: "A signed-in user gets an org",
        gate: Gate.define({
          observe:
            createHttpObserveResource({
              url: "http://127.0.0.1:3000/org",
            }),
          act: [
            Act.exec(
              "curl -fsS http://127.0.0.1:3000/org",
            ),
          ],
          assert: [
            Assert.httpResponse({
              status: 200,
            }),
            Assert.noErrors(),
          ],
        }),
      },
      {
        id: "dashboard",
        title: "The protected dashboard returns 200",
        gate: Gate.define({
          observe:
            createHttpObserveResource({
              url: "http://127.0.0.1:3000/dashboard",
            }),
          act: [
            Act.exec(
              "curl -fsS http://127.0.0.1:3000/dashboard",
            ),
          ],
          assert: [
            Assert.httpResponse({
              status: 200,
            }),
            Assert.noErrors(),
          ],
        }),
      },
    ],
    loop: {
      maxIterations: 12,
    },
  }),
};

await Effect.runPromise(
  Plan.runLoop(scope.plan, {
    maxIterations: 12,
    agent: async ({ failedGoals }) => {
      // fix routes, auth, or data flow here
      console.log(failedGoals.map((goal) => goal.summary));
    },
  }),
);`;

  const steps: FrontdoorStep[] = [
    {
      label: "01 Local",
      mode: "direct",
      title: "Hello world in one file.",
      proves: "A single plan.ts can define the gate, explain the goal, and run the loop.",
      changed: "Nothing yet. This is the base pattern.",
      fileName: "plan.ts",
      code: renderScopeSnippet(scope, { fileName: "plan.ts" }),
    },
    {
      label: "02 Attached",
      mode: "attached",
      title: "Same loop, but with an attached agent.",
      proves:
        "The loop still runs the same way, but now an attached agent fixes the app between failed iterations.",
      changed:
        "You are no longer just running checks. The loop becomes the coordinator for a real local app.",
      fileName: "worker.ts + server.ts + plan.ts",
      code: attachedCode,
    },
    {
      label: "03 Edge",
      mode: "direct",
      title: "Smallest worker on Cloudflare.",
      proves:
        "A tiny Worker can be provisioned once with Alchemy and proved with the same Gateproof loop.",
      changed:
        "Now the target is a real hosted worker, but the loop still only checks a URL and shell output.",
      fileName: "alchemy.run.ts + plan.ts",
      code: edgeCode,
    },
    {
      label: "04 Worker",
      mode: "attached",
      title: "Build a Hono worker to green.",
      proves:
        "The same pattern can build a tiny Hono worker by fixing worker.ts until the live URL goes green.",
      changed:
        "Alchemy still provisions once. The attached agent now has a real app file to build.",
      fileName: "alchemy.run.ts + plan.ts",
      code: workerCode,
    },
    {
      label: "05 Starter",
      mode: "attached",
      title: "Take a real starter from red to usable.",
      proves:
        "One plan can coordinate multiple real HTTP goals across an app slice and keep calling the agent until they pass.",
      changed:
        "This is no longer one route. It is an ordered app flow with multiple gates.",
      fileName: "starter-slice.ts",
      code: starterCode,
    },
  ];

  return {
    eyebrow: scope.spec.title,
    headline: "One file. Two ways to use it.",
    subheadline: "Run plan.ts directly, or hand it to an attached agent. The loop stays the same as the target gets bigger.",
    steps,
  };
}
