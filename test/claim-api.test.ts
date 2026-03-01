import { test, expect } from "bun:test";
import {
  Gate,
  Evidence,
  Expectation,
  Report,
  toClaimResultV1,
} from "../src/index";

test("claim: passes with outcome evidence and satisfied expectation", async () => {
  const gate = Gate.define({
    name: "Health endpoint is live",
    intent: "Proves the API responds with HTTP 200",
    exercise: async () => {},
    collect: [
      Evidence.http({
        id: "health-response",
        request: async () => new Response("ok", { status: 200 }),
      }),
    ],
    expect: async () => Expectation.ok("health endpoint returned HTTP 200"),
    requirements: {
      minKinds: ["outcome"],
      allowSynthetic: false,
      minProofStrength: "strong",
    },
  });

  const result = await gate.run({
    env: process.env as Record<string, string | undefined>,
    target: "https://api.example.com",
  });

  expect(result.status).toBe("pass");
  expect(result.proofStrength).toBe("strong");
  expect(result.evidence).toHaveLength(1);
});

test("claim: returns skip when a prerequisite fails", async () => {
  const gate = Gate.define({
    name: "Needs baseline",
    intent: "Requires a baseline measurement before execution",
    prerequisites: [async () => false],
    exercise: async () => {
      throw new Error("exercise should not run");
    },
    collect: [],
    expect: async () => Expectation.ok(),
  });

  const result = await gate.run({
    env: {},
  });

  expect(result.status).toBe("skip");
  expect(result.phase).toBe("prerequisites");
});

test("claim: downgrades to inconclusive when only telemetry is collected", async () => {
  const gate = Gate.define({
    name: "Webhook queues a job",
    intent: "Needs externally observable proof",
    exercise: async () => {},
    collect: [
      Evidence.logs({
        id: "orchestrator-logs",
        read: async () => ["action=job_queued"],
      }),
    ],
    expect: async () => Expectation.ok("logs show a queue event"),
    requirements: {
      minKinds: ["outcome"],
      minProofStrength: "moderate",
    },
  });

  const result = await gate.run({
    env: {},
  });

  expect(result.status).toBe("inconclusive");
  expect(result.notes.some((note) => note.includes("Missing required evidence kinds"))).toBe(true);
});

test("claim: downgrades to inconclusive when synthetic evidence is disallowed", async () => {
  const gate = Gate.define({
    name: "Placeholder proof is rejected",
    intent: "Synthetic evidence must not count as a real pass",
    exercise: async () => {},
    collect: [
      Evidence.synthetic({
        id: "fake-cache-hit",
        build: async () => ({ hit: true }),
      }),
    ],
    expect: async () => Expectation.ok("placeholder returned a cache hit"),
    requirements: {
      allowSynthetic: false,
    },
  });

  const result = await gate.run({
    env: {},
  });

  expect(result.status).toBe("inconclusive");
  expect(result.notes.some((note) => note.includes("Synthetic evidence is not allowed"))).toBe(true);
});

test("claim: reports are machine-serializable and human-readable", async () => {
  const gate = Gate.define({
    name: "Health endpoint is live",
    intent: "Proves the API responds with HTTP 200",
    exercise: async () => {},
    collect: [
      Evidence.http({
        id: "health-response",
        request: async () => new Response("ok", { status: 200 }),
      }),
    ],
    expect: async () => Expectation.ok("health endpoint returned HTTP 200"),
    requirements: {
      minKinds: ["outcome"],
      minProofStrength: "strong",
    },
  });

  const result = await gate.run({
    env: {},
  });

  const text = Report.text(result);
  const json = Report.json(result);
  const parsed = JSON.parse(json);
  const v1 = toClaimResultV1(result);

  expect(text).toContain("Gate: Health endpoint is live");
  expect(parsed.version).toBe("1");
  expect(parsed.kind).toBe("gate");
  expect(parsed.status).toBe("pass");
  expect(v1.proofStrength).toBe("strong");
});
