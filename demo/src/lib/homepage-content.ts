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
  eyebrow: "typescript library",
  headline: "Define done. Let agents figure out the rest.",
  subheadline:
    "Gateproof is a TypeScript library for writing pass/fail gates that agentic coding loops run against. You describe what working looks like — the agent iterates until it gets there.",
  snippetLabel: "hello world",
  snippetTitle: "A goal is an observable condition and an action to try.",
  snippetBody:
    "This plan checks if GET / returns 200. If it doesn't, the agent runs curl. That's it.",
  snippetCode: helloWorldSnippet,
  principles: [
    {
      title: "You write the condition",
      body: "A gate is an HTTP check, a shell command, or any observable assertion. No magic — just a function that returns pass or fail.",
    },
    {
      title: "The agent runs the loop",
      body:
        "Observe, act, assert, repeat. The agent keeps trying the action until every assertion passes or the loop times out.",
    },
    {
      title: "One file is the whole spec",
      body: "Your plan.ts is readable by humans and executable by agents. No config layer, no dashboard — just TypeScript.",
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
