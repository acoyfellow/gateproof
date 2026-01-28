export interface StoryScope {
  allowedPaths?: string[];
  forbiddenPaths?: string[];
  maxChangedFiles?: number;
  maxChangedLines?: number;
}

export type Story<TId extends string = string> = {
  id: TId;
  title: string;
  gateFile: string;
  dependsOn?: TId[];
  scope?: StoryScope;
  progress?: string[];
  /**
   * When true, auto-fail the gate if no positive evidence is collected.
   * Positive evidence means at least one log with an action or stage field.
   * Default: false (for backward compatibility).
   */
  requirePositiveSignal?: boolean;
};

export type Prd<TId extends string = string> = {
  stories: readonly Story<TId>[];
};

export type GateResult = {
  status: "success" | "failed" | "timeout";
  [key: string]: unknown;
};
