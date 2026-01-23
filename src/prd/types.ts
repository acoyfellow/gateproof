export type Story<TId extends string = string> = {
  id: TId;
  title: string;
  gateFile: string;
  dependsOn?: TId[];
};

export type Prd<TId extends string = string> = {
  stories: readonly Story<TId>[];
};

export type GateResult = {
  status: "success" | "failed" | "timeout";
  [key: string]: unknown;
};
