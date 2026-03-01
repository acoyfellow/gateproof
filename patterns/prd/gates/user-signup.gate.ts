#!/usr/bin/env bun
import { Gate, Act, Assert, createHttpObserveResource } from "../../../src/index";

function requireObserveUrl(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required. Point it at a real log or event endpoint.`);
  }
  return value;
}

export async function run() {
  return Gate.run({
    name: "user-signup",
    observe: createHttpObserveResource({
      url: requireObserveUrl("USER_SIGNUP_GATE_URL"),
    }),
    act: [Act.wait(250)],
    assert: [Assert.noErrors(), Assert.hasAction("user_created")],
    stop: { idleMs: 1000, maxMs: 10000 },
    report: "pretty",
  });
}
