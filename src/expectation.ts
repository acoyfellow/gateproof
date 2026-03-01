import type { ExpectationResult } from "./claim-types";

export const Expectation = {
  ok(reason = "expectation satisfied"): ExpectationResult {
    return { ok: true, reason };
  },

  fail(
    reason = "expectation failed",
    measured?: Record<string, number | string | boolean>
  ): ExpectationResult {
    return { ok: false, reason, measured };
  },

  threshold(opts: {
    metric: string;
    actual: number;
    baseline: number;
    minDelta: number;
  }): ExpectationResult {
    const delta = opts.baseline - opts.actual;
    return {
      ok: delta >= opts.minDelta,
      reason: `${opts.metric}: delta=${delta} required=${opts.minDelta}`,
      measured: {
        metric: opts.metric,
        actual: opts.actual,
        baseline: opts.baseline,
        delta,
        minDelta: opts.minDelta,
      },
    };
  },
};
