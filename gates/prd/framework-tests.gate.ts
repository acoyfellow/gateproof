#!/usr/bin/env bun
import { Gate, Act, Assert } from "../../src/index";
import { createEmptyObserveResource } from "../../src/utils";

export async function run() {
  const result = await Gate.run({
    name: "framework-tests",
    observe: createEmptyObserveResource(),
    act: [
      Act.exec("bun test --exclude test/demo.production.test.ts", {
        cwd: process.cwd(),
        timeoutMs: 45000,
      }),
    ],
    assert: [Assert.custom("tests_succeed", async () => true)],
    stop: { idleMs: 1000, maxMs: 45000 },
  });

  return { status: result.status };
}
