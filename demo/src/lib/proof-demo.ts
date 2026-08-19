export type ProofDemoTone = "muted" | "fail" | "warn" | "pass";

export interface ProofDemoLine {
  text: string;
  tone?: ProofDemoTone;
}

export interface ProofDemoStep {
  id: string;
  title: string;
  caption: string;
  implementation: string;
  contract: string;
  lines: ReadonlyArray<ProofDemoLine>;
}

export const PROOF_DEMO_NOTE =
  "Illustrative terminal. The sequence matches Plan.runLoop, createOpenCodeWorker, and the default forbidden path plan.ts. It is not a live run.";

export const proofDemoPlan = `import { Effect } from "effect";
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
    scope: {
      allowedPaths: ["examples/hello-world/"],
      maxChangedFiles: 1,
      maxChangedLines: 5,
    },
    gate: Gate.define({
      observe: createHttpObserveResource({ url: "http://127.0.0.1:33000/" }),
      act: [Act.exec("curl -sf http://127.0.0.1:33000/")],
      assert: [
        Assert.httpResponse({ status: 200 }),
        Assert.responseBodyIncludes("hello world"),
        Assert.noErrors(),
      ],
    }),
  }],
  loop: { maxIterations: 3 },
});

await Effect.runPromise(Plan.runLoop(plan, {
  worker: createOpenCodeWorker({ endpoint }),
  cwd,
  planPath: "examples/hello-world/plan.ts",
}));`;

export const proofDemoSteps: ReadonlyArray<ProofDemoStep> = [
  {
    id: "fail",
    title: "1. Assertion fails",
    caption: "Plan.run sees the live body. hello world is not there.",
    implementation: "examples/hello-world/response.txt → not ready",
    contract: "plan.ts unchanged",
    lines: [
      { text: "$ bun run example:hello-world:worker" },
      { text: "GET /  →  200" },
      { text: 'body   →  "not ready"', tone: "fail" },
      {
        text: 'assert responseBodyIncludes("hello world")  FAIL',
        tone: "fail",
      },
      { text: "status: fail", tone: "fail" },
    ],
  },
  {
    id: "attempt",
    title: "2. Worker attempts a change",
    caption: "createOpenCodeWorker may write only inside allowedPaths.",
    implementation: "worker proposes examples/hello-world/response.txt",
    contract: "plan.ts still the authority",
    lines: [
      { text: "firstFailedGoal: hello-world" },
      { text: "scope.allowedPaths: [examples/hello-world/]" },
      { text: "worker.write examples/hello-world/response.txt" },
      { text: "iteration 1 committed", tone: "muted" },
    ],
  },
  {
    id: "tamper",
    title: "3. Tampering with plan.ts is rejected",
    caption: "plan.ts is on the default forbidden list. The loop records a scope violation.",
    implementation: "no accept of a contract edit",
    contract: "plan.ts forbidden — attempt rejected",
    lines: [
      { text: "worker.write plan.ts", tone: "warn" },
      {
        text: 'scope violation: changed forbidden path "plan.ts"',
        tone: "fail",
      },
      { text: "status: fail", tone: "fail" },
      { text: ".gateproof/iterations/1.json written", tone: "muted" },
    ],
  },
  {
    id: "retry",
    title: "4. Bounded retry stays in scope",
    caption: "maxIterations: 3. The next turn may only touch examples/hello-world/.",
    implementation: "retry limited to examples/hello-world/",
    contract: "plan.ts still forbidden",
    lines: [
      { text: "iteration 2 / maxIterations 3" },
      { text: "allowed: examples/hello-world/response.txt", tone: "pass" },
      { text: "forbidden: plan.ts, README.md, .env", tone: "muted" },
    ],
  },
  {
    id: "pass",
    title: "5. PASS — implementation changed, contract did not",
    caption: "The gate now observes hello world. The proof file is the same file the human wrote.",
    implementation: "response.txt → hello world",
    contract: "plan.ts unchanged",
    lines: [
      { text: 'body   →  "hello world"', tone: "pass" },
      {
        text: 'assert responseBodyIncludes("hello world")  PASS',
        tone: "pass",
      },
      { text: "status: pass", tone: "pass" },
      { text: "commits: 2  (baseline + allowed fix)", tone: "muted" },
    ],
  },
];

export function proofDemoStepIds(): string[] {
  return proofDemoSteps.map((step) => step.id);
}

export function isCompleteProofArc(ids: ReadonlyArray<string>): boolean {
  return (
    ids.join(",") ===
    "fail,attempt,tamper,retry,pass"
  );
}
