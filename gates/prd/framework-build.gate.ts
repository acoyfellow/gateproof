#!/usr/bin/env bun
import { Gate, Act, Assert } from "../../src/index";
import { createEmptyObserveResource } from "../../src/utils";

export async function run() {
  const result = await Gate.run({
    name: "framework-build",
    observe: createEmptyObserveResource(),
    act: [Act.exec("bun run build", { cwd: process.cwd() })],
    assert: [Assert.custom("build_succeeds", async () => true)],
    stop: { idleMs: 1000, maxMs: 60000 },
  });

  return { status: result.status };
}
