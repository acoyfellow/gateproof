export interface Log {
  requestId?: string;
  timestamp?: string;
  stage?: string;
  action?: string;
  status?: "start" | "success" | "error" | "info";
  error?: {
    tag: string;
    message: string;
    stack?: string;
  };
  data?: Record<string, unknown>;
  durationMs?: number;
  [k: string]: unknown;
}

export interface LogFilter {
  requestId?: string;
  stage?: string;
  action?: string;
  status?: "start" | "success" | "error" | "info";
  since?: Date;
  until?: Date;
}

export type LogStream = AsyncIterable<Log>;

export interface GateResult {
  status: "success" | "failed" | "timeout";
  durationMs: number;
  logs: Log[];
  evidence: {
    requestIds: string[];
    stagesSeen: string[];
    actionsSeen: string[];
    errorTags: string[];
  };
  error?: Error;
}

export interface ObserveConfig {
  backend: string;
  [k: string]: unknown;
}

