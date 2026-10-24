# Tutorial: Your First Gate

**You will:** run one story against a live HTTP server and see it pass.

**Time:** a few minutes once Bun is installed.

## Before you start

You need [Bun](https://bun.sh) 1.3 or later, `git`, and `curl`.

## 1. Get the code

```bash
git clone https://github.com/acoyfellow/gateproof
cd gateproof
bun install
```

## 2. Read the plan

A plan is a list of **stories**. Each story has one **gate**. A gate has three parts:

- `observe` — what Gateproof watches. Here, an HTTP endpoint.
- `act` — what Gateproof runs. Here, one `curl`.
- `assert` — what must be true. Here, status 200 and a body that contains `hello world`.

```ts
import { Effect } from "effect";
import { Act, Assert, Gate, Plan, createHttpObserveResource } from "gateproof";

const baseUrl = "http://127.0.0.1:3210";

const plan = Plan.define({
  stories: [
    {
      id: "hello-world",
      title: "GET / returns hello world",
      gate: Gate.define({
        observe: createHttpObserveResource({ url: `${baseUrl}/` }),
        act: [Act.exec(`curl -sf ${baseUrl}/`)],
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
if (result.status !== "pass") process.exitCode = 1;
```

This is a simplified copy of [`examples/hello-world/plan.ts`](https://github.com/acoyfellow/gateproof/blob/main/examples/hello-world/plan.ts). The real file imports from `../../src/index`, adds a `spec` block, and calls `Plan.runLoop` with `maxIterations: 1`. Run it inside the cloned repository. The npm package 0.5.0 does not support `stories` yet. To run this snippet by itself, start the server first with `bun examples/hello-world/server.ts`.

## 3. Run it

```bash
bun run example:hello-world
```

This command starts the local server on port 3210, runs the plan, and stops the server. The process exits 0 when every story passes.

## 4. Break it

Create or edit `examples/hello-world/response.txt` so it contains `not ready`. Run the command again. The story fails, and the process exits 1. Then restore the file. If the file is missing or empty, the server answers `hello world`.

## What a result means

Each story ends with one status:

- `pass` — every assertion held.
- `fail` — an assertion did not hold.
- `inconclusive` — evidence was missing. A missing server gives `inconclusive`, not `pass`. Gateproof does not guess.

The full rules are in the [API reference](/docs/reference/api#results).

Next: [Run in a Loop](/docs/how-to/run-in-a-loop).
