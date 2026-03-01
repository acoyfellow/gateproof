import type { ClaimContext, EvidenceKind, EvidenceRecord } from "./claim-types";

function createRecord<T>(
  id: string,
  kind: EvidenceKind,
  source: string,
  summary: string,
  data: T
): EvidenceRecord<T> {
  return {
    id,
    kind,
    source,
    summary,
    data,
    collectedAt: new Date().toISOString(),
  };
}

export const Evidence = {
  value<T>(opts: {
    id: string;
    kind: EvidenceKind;
    source: string;
    collect: (ctx: ClaimContext) => T | Promise<T>;
    summarize?: (data: T) => string;
  }) {
    return async (ctx: ClaimContext): Promise<EvidenceRecord<T>> => {
      const data = await opts.collect(ctx);
      const summary = opts.summarize?.(data) ?? `${opts.kind} evidence collected`;
      return createRecord(opts.id, opts.kind, opts.source, summary, data);
    };
  },

  http(opts: {
    id: string;
    request: (ctx: ClaimContext) => Promise<Response>;
    source?: string;
    summarize?: (
      snapshot: {
        ok: boolean;
        status: number;
        url: string;
        body?: string;
      }
    ) => string | Promise<string>;
    includeBody?: boolean;
  }) {
    return async (ctx: ClaimContext): Promise<EvidenceRecord> => {
      const response = await opts.request(ctx);
      const clone = response.clone();
      const body = opts.includeBody ? await clone.text() : undefined;
      const snapshot = {
        ok: response.ok,
        status: response.status,
        url: response.url,
        body,
      };
      const summary = opts.summarize
        ? await opts.summarize(snapshot)
        : `HTTP ${snapshot.status} ${snapshot.ok ? "ok" : "error"}`;

      return createRecord(
        opts.id,
        "outcome",
        opts.source ?? "http",
        summary,
        snapshot
      );
    };
  },

  timing(opts: {
    id: string;
    measure: (ctx: ClaimContext) => Promise<number>;
    source?: string;
    unit?: "ms";
  }) {
    return async (ctx: ClaimContext): Promise<EvidenceRecord<number>> => {
      const value = await opts.measure(ctx);
      const unit = opts.unit ?? "ms";
      return createRecord(
        opts.id,
        "outcome",
        opts.source ?? "timing",
        `${value}${unit}`,
        value
      );
    };
  },

  logs(opts: {
    id: string;
    read: (ctx: ClaimContext) => Promise<string[]>;
    source?: string;
  }) {
    return async (ctx: ClaimContext): Promise<EvidenceRecord<string[]>> => {
      const lines = await opts.read(ctx);
      return createRecord(
        opts.id,
        "telemetry",
        opts.source ?? "logs",
        `${lines.length} log line(s)`,
        lines
      );
    };
  },

  control<T>(opts: {
    id: string;
    read: (ctx: ClaimContext) => Promise<T>;
    source?: string;
    summarize?: (data: T) => string;
  }) {
    return async (ctx: ClaimContext): Promise<EvidenceRecord<T>> => {
      const data = await opts.read(ctx);
      return createRecord(
        opts.id,
        "control_plane",
        opts.source ?? "control-plane",
        opts.summarize?.(data) ?? "control-plane evidence collected",
        data
      );
    };
  },

  synthetic<T>(opts: {
    id: string;
    build: (ctx: ClaimContext) => T | Promise<T>;
    source?: string;
    summarize?: (data: T) => string;
  }) {
    return async (ctx: ClaimContext): Promise<EvidenceRecord<T>> => {
      const data = await opts.build(ctx);
      return createRecord(
        opts.id,
        "synthetic",
        opts.source ?? "synthetic",
        opts.summarize?.(data) ?? "synthetic evidence generated",
        data
      );
    };
  },
};
