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
  snippetHtml?: string;
  principles: ReadonlyArray<PrincipleCard>;
  ctaEyebrow: string;
  ctaTitle: string;
  ctaBody: string;
  ctaHref: string;
  ctaLabel: string;
  githubHref: string;
  npmHref: string;
}

const helloWorldSnippet = `import { Effect } from "effect";
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

export const homepageContent: HomepageContent = {
  eyebrow: "proof authority for coding agents",
  headline: "The agent writes code. Gateproof says when it is done.",
  subheadline:
    "A plan.ts file is the contract. Plan.runLoop observes, acts, and asserts. Workers may change files inside allowedPaths. They may not rewrite the proof — plan.ts is forbidden by default.",
  snippetLabel: "hello world",
  snippetTitle: "The contract is one executable TypeScript file.",
  snippetBody:
    "This is the public API: Gate.define, Plan.define, Plan.run / Plan.runLoop. The homepage walkthrough below is illustrative. The hello-world worker path is the live witness.",
  snippetCode: helloWorldSnippet,
  principles: [
    {
      title: "You write the condition",
      body: "A gate is an HTTP check, a shell command, or any observable assertion. Pass or fail is evidence, not a model opinion.",
    },
    {
      title: "The agent runs the loop",
      body:
        "Plan.runLoop hands the first failing goal to a worker. createOpenCodeWorker may retry inside allowedPaths until the gate passes or maxIterations stops it.",
    },
    {
      title: "The contract stays sealed",
      body: "plan.ts, README.md, and .env are forbidden by default. A worker that edits the proof is a scope violation, not a pass.",
    },
    {
      title: "Same shape as unsurf",
      body:
        "Gateproof drives HTTP and exec. unsurf drives the DOM. Both speak proof-spec.v0 — the observe/act/assert schema round-trips between them. Import goalToProofSpec from gateproof to publish a plan as a typed spec, or proofSpecToGoal to run one unsurf scouted.",
    },
  ],
  ctaEyebrow: "Case Studies",
  ctaTitle: "See it run against real systems.",
  ctaBody: "Cinder is the first case study — a real system validated by a single plan file, start to finish.",
  ctaHref: "/case-studies",
  ctaLabel: "Read the case study",
  githubHref: "https://github.com/acoyfellow/gateproof",
  npmHref: "https://www.npmjs.com/package/gateproof",
};
