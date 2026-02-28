/**
 * Shared utilities for gateproof gates
 * These utilities reduce boilerplate and standardize common patterns
 */

import { Effect } from "effect";
import { Gate, type GateSpec, type GateResult } from "./index";
import { createObserveResource, type Backend } from "./observe";
import type { Log } from "./types";

/**
 * Creates an empty backend that yields no logs
 * Useful for gates that validate HTTP endpoints without log observation
 */
export function createEmptyBackend(): Backend {
  return {
    start: () =>
      Effect.succeed<AsyncIterable<Log>>({
      async *[Symbol.asyncIterator]() {
        return;
      },
    }),
    stop: () => Effect.void,
  };
}

/**
 * Creates an observe resource from an empty backend
 * Convenience wrapper for the common pattern
 */
export function createEmptyObserveResource() {
  return createObserveResource(createEmptyBackend());
}

/**
 * Runs a gate with standardized error handling
 * Returns a result object with consistent structure even on errors
 */
export function runGateWithErrorHandling(
  gate: GateSpec,
  _name: string
): Promise<GateResult> {
  return Effect.runPromise(
    Effect.tryPromise({
      try: () => Gate.run(gate),
      catch: (unknownError) => unknownError
    }).pipe(
      Effect.catchAll((unknownError) => {
        const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
        console.error(`   Error: ${error.message}`);
        return Effect.succeed({
          status: "failed" as const,
          durationMs: 0,
          logs: [],
          evidence: { actionsSeen: [], errorTags: [], requestIds: [], stagesSeen: [] },
          error,
        } as GateResult);
      })
    )
  );
}
