#!/usr/bin/env bun
/**
 * Gate: Agent-first pattern docs
 *
 * Verifies the spec interview pattern and template exist and include key guidance.
 */

import { Gate, Assert } from "../../src/index";
import { createEmptyObserveResource } from "../../src/utils";

const patternPath = `${import.meta.dir}/../../patterns/agent-first/README.md`;
const templatePath = `${import.meta.dir}/../../patterns/agent-first/spec-interview-template.md`;

export async function run() {
  const result = await Gate.run({
    name: "agent-first-pattern",
    observe: createEmptyObserveResource(),
    act: [],
    assert: [
      Assert.custom("pattern_doc_exists", async () => {
        return await Bun.file(patternPath).exists();
      }),
      Assert.custom("template_doc_exists", async () => {
        return await Bun.file(templatePath).exists();
      }),
      Assert.custom("pattern_doc_has_required_sections", async () => {
        const content = await Bun.file(patternPath).text();
        const required = [
          "Spec interview",
          "PRD stories",
          "Guardrails",
          "Evidence-first",
        ];
        return required.every((token) => content.includes(token));
      }),
      Assert.custom("template_has_questions_and_output", async () => {
        const content = await Bun.file(templatePath).text();
        return content.includes("Interview questions") && content.includes("Output: PRD stories");
      }),
    ],
    stop: { idleMs: 1000, maxMs: 30000 },
  });

  return { status: result.status };
}
