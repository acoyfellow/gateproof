#!/usr/bin/env bun
import { prd, type Story } from "./prd";

function isDone(story: Story): boolean {
  return story.status === "done";
}

function orderStories(stories: readonly Story[]): Story[] {
  const byId = new Map(stories.map((s) => [s.id, s]));
  const out: Story[] = [];
  const remaining = new Set(stories.map((s) => s.id));

  while (remaining.size > 0) {
    let progressed = false;

    for (const id of Array.from(remaining)) {
      const story = byId.get(id);
      if (!story) throw new Error(`Unknown story id: ${id}`);

      const deps = story.dependsOn ?? [];
      const depsSatisfied = deps.every((depId) => {
        const dep = byId.get(depId);
        if (!dep) throw new Error(`Unknown dependency id: ${depId}`);
        return isDone(dep) || out.some((s) => s.id === depId);
      });

      if (!depsSatisfied) continue;

      out.push(story);
      remaining.delete(id);
      progressed = true;
    }

    if (!progressed) {
      throw new Error("PRD dependency cycle (or missing dependency).");
    }
  }

  return out;
}

const ordered = orderStories(prd.stories);

for (const story of ordered) {
  if (isDone(story)) continue;

  const gateUrl = new URL(story.gateFile, import.meta.url).href;
  const mod = await import(gateUrl);
  const run: unknown = mod.run;

  if (typeof run !== "function") {
    throw new Error(`Gate file must export "run": ${story.gateFile}`);
  }

  console.log(`\n--- ${story.id}: ${story.title}`);
  const result = await (run as () => Promise<{ status: string }> )();
  if (result.status !== "success") process.exit(1);
}

process.exit(0);

