export interface FeatureCard {
  tag: string;
  title: string;
  body: string;
  href: string;
}

export interface HomepageContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  versionNote: string;
  snippetLabel: string;
  snippetTitle: string;
  snippetBody: string;
  snippetCode: string;
  snippetHtml?: string;
  snippetNote: string;
  featuresTitle: string;
  features: ReadonlyArray<FeatureCard>;
  ctaEyebrow: string;
  ctaTitle: string;
  ctaBody: string;
  ctaHref: string;
  ctaLabel: string;
  githubHref: string;
  docsHref: string;
}

const helloWorldSnippet = `import { Effect } from "effect";
import { Act, Assert, Gate, Plan, createHttpObserveResource } from "gateproof";

const plan = Plan.define({
  stories: [
    {
      id: "hello-world",
      title: "GET / returns hello world",
      gate: Gate.define({
        observe: createHttpObserveResource({ url: "http://127.0.0.1:3210/" }),
        act: [Act.exec("curl -sf http://127.0.0.1:3210/")],
        assert: [
          Assert.httpResponse({ status: 200 }),
          Assert.responseBodyIncludes("hello world"),
          Assert.noErrors(),
        ],
      }),
    },
  ],
});

const result = await Effect.runPromise(Plan.run(plan));
if (result.status !== "pass") process.exitCode = 1;`;

export const homepageContent: HomepageContent = {
  eyebrow: "proof authority for coding agents",
  headline: "The agent writes code. Gateproof says when it is done.",
  subheadline:
    "Write the claim in plan.ts as a list of stories. Each story has a gate: observe, act, assert. The agent may change code inside the story's scope. It may not change plan.ts.",
  versionNote: "0.6.0 on main · npm has 0.5.0",
  snippetLabel: "one story",
  snippetTitle: "The contract is one executable TypeScript file.",
  snippetBody:
    "Plan.define checks the stories. Plan.run runs them once. Plan.runLoop hands the first failing story to a worker and runs again.",
  snippetCode: helloWorldSnippet,
  snippetNote: "To run it: clone the repo, bun install, then start the server with bun examples/hello-world/server.ts",
  featuresTitle: "What Gateproof does today",
  features: [
    {
      tag: "stories",
      title: "Stories with scope",
      body: "Each story limits what a worker may change: allowed paths, forbidden paths, file and line budgets. plan.ts is forbidden by default.",
      href: "/docs/how-to/run-in-a-loop",
    },
    {
      tag: "dependsOn",
      title: "Stories in order",
      body: "A story can list earlier stories in dependsOn. If one of them ran and did not pass, the story fails without running. Plan.define rejects cycles.",
      href: "/docs/how-to/run-in-a-loop#story-order-with-dependson",
    },
    {
      tag: "lean",
      title: "Lean as the judge",
      body: "A story can pass only when the Lean kernel accepts a theorem. The example keeps sorry and axiom cheats red.",
      href: "/docs/how-to/gate-a-lean-proof",
    },
    {
      tag: "workers",
      title: "Workers propose, gates decide",
      body: "Use the built-in worker, one bounded turn on filepath, or your own function. A change outside scope is rejected.",
      href: "/docs/how-to/use-the-filepath-worker-alpha",
    },
    {
      tag: "deja",
      title: "Memory between runs",
      body: "Deja recalls learnings before each iteration and stores new ones after. A memory error never fails the run.",
      href: "/docs/how-to/add-deja-memory",
    },
    {
      tag: "proof-spec.v0",
      title: "Same schema as unsurf",
      body: "planToProofSpecs turns stories into proof-spec.v0. Gateproof runs HTTP and shell. unsurf runs the browser.",
      href: "/docs/explanations/proof-spec",
    },
  ],
  ctaEyebrow: "a few minutes with Bun",
  ctaTitle: "Run your first gate.",
  ctaBody: "Clone the repository, run bun run example:hello-world, and break it on purpose.",
  ctaHref: "/docs/tutorials/first-gate",
  ctaLabel: "Start the tutorial",
  githubHref: "https://github.com/acoyfellow/gateproof",
  docsHref: "/docs",
};
