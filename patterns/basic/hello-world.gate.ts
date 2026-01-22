#!/usr/bin/env bun
/**
 * Hello World Gate
 * 
 * Simplest possible gate: wait, then assert no errors.
 * Demonstrates minimal gateproof API surface.
 */

import { Gate, Act, Assert, createEmptyObserveResource } from "../../src/index";

const gate = {
  observe: createEmptyObserveResource(),
  act: [Act.wait(100)],
  assert: [Assert.noErrors()],
};

Gate.run(gate)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.status === "success" ? 0 : 1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
