#!/usr/bin/env bun
import { Gate, Act, Assert } from "../../../src/index";
import type { Log } from "../../../src/types";
import { createTestObserveResource } from "../../../src/test-helpers";
import { Effect, Queue, Runtime } from "effect";

async function withQueue<T>(fn: (queue: Queue.Queue<Log>) => Promise<T>): Promise<T> {
  const runtime = Runtime.defaultRuntime;
  const queue = await Runtime.runPromise(runtime)(Queue.unbounded<Log>());
  try {
    return await fn(queue);
  } finally {
    await Runtime.runPromise(runtime)(Queue.shutdown(queue));
  }
}

export async function run() {
  return withQueue(async (queue) => {
    const logs: Log[] = [
      {
        timestamp: new Date().toISOString(),
        stage: "prd",
        action: "email_verified",
        status: "success"
      }
    ];

    await Runtime.runPromise(Runtime.defaultRuntime)(
      Effect.forEach(logs, (log) => Queue.offer(queue, log))
    );

    return Gate.run({
      name: "email-verification",
      observe: createTestObserveResource(queue),
      act: [Act.wait(50)],
      assert: [Assert.noErrors(), Assert.hasAction("email_verified")],
      stop: { idleMs: 200, maxMs: 1500 },
      report: "pretty"
    });
  });
}

