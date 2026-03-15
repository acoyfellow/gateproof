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
  eyebrow: "steer the loop",
  headline: "Build software in reverse.",
  subheadline: "Start from the spec; let the loop make reality match.",
  snippetLabel: "hello world",
  snippetTitle: "One file. One gate. One real pass condition.",
  snippetBody: "Define what done looks like. Hand it to the loop.",
  snippetCode: helloWorldSnippet,
  principles: [
    {
      title: "Define done first",
      body: "The gate describes the finished behavior before any code exists.",
    },
    {
      title: "Use one worker path at a time",
      body:
        "The built-in worker is the stable demo path. filepath is a separate runtime alpha that returns a patch for Gateproof to apply locally.",
    },
    {
      title: "One file, one contract",
      body: "The same file the human reads is the file the loop hands to the worker.",
    },
  ],
  ctaEyebrow: "Case Studies",
  ctaTitle: "Proof loops in the wild.",
  ctaBody: "Real systems, one plan, one loop. Cinder is the first; more to come.",
  ctaHref: "/case-studies",
  ctaLabel: "See case studies",
  githubHref: "https://github.com/acoyfellow/gateproof",
  npmHref: "https://www.npmjs.com/package/gateproof",
};
