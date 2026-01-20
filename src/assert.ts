import { Effect, Schema } from "effect";
import type { Log } from "./types";

export class AssertionFailed extends Schema.TaggedError<AssertionFailed>()(
  "AssertionFailed",
  {
    assertion: Schema.String,
    details: Schema.Unknown
  }
) {}

export class AssertionAggregateFailed extends Schema.TaggedError<AssertionAggregateFailed>()(
  "AssertionAggregateFailed",
  {
    failures: Schema.Array(Schema.instanceOf(AssertionFailed))
  }
) {}

export type Assertion =
  | { _tag: "NoErrors" }
  | { _tag: "HasAction"; action: string }
  | { _tag: "HasStage"; stage: string }
  | { _tag: "Custom"; fn: (logs: Log[]) => boolean | Promise<boolean>; name: string };

export namespace Assert {
  export function noErrors(): Assertion {
    return { _tag: "NoErrors" };
  }

  export function hasAction(action: string): Assertion {
    return { _tag: "HasAction", action };
  }

  export function hasStage(stage: string): Assertion {
    return { _tag: "HasStage", stage };
  }

  export function custom(
    name: string,
    fn: (logs: Log[]) => boolean | Promise<boolean>
  ): Assertion {
    return { _tag: "Custom", fn, name };
  }

  export function run(
    assertions: Assertion[],
    logs: Log[]
  ): Effect.Effect<void, AssertionFailed | AssertionAggregateFailed> {
    return Effect.gen(function* () {
      const failures: AssertionFailed[] = [];

      for (const assertion of assertions) {
        if (assertion._tag === "NoErrors") {
          const errorLog = logs.find((l) => l.status === "error" || l.error);
          if (errorLog) {
            failures.push(
              new AssertionFailed({
                assertion: "NoErrors",
                details: { found: errorLog }
              })
            );
          }
        } else if (assertion._tag === "HasAction") {
          const found = logs.some((l) => l.action === assertion.action);
          if (!found) {
            failures.push(
              new AssertionFailed({
                assertion: "HasAction",
                details: {
                  missing: assertion.action,
                  seen: logs.map((l) => l.action).filter(Boolean)
                }
              })
            );
          }
        } else if (assertion._tag === "HasStage") {
          const found = logs.some((l) => l.stage === assertion.stage);
          if (!found) {
            failures.push(
              new AssertionFailed({
                assertion: "HasStage",
                details: {
                  missing: assertion.stage,
                  seen: logs.map((l) => l.stage).filter(Boolean)
                }
              })
            );
          }
        } else if (assertion._tag === "Custom") {
          const passed = yield* Effect.promise(() => Promise.resolve(assertion.fn(logs)));
          if (!passed) {
            failures.push(
              new AssertionFailed({
                assertion: assertion.name,
                details: { custom: true }
              })
            );
          }
        }
      }

      if (failures.length > 0) {
        if (failures.length === 1) {
          yield* Effect.fail(failures[0]);
        } else {
          yield* Effect.fail(new AssertionAggregateFailed({ failures }));
        }
      }
    });
  }
}
