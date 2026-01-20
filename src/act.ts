import type { Log } from "./types";

export type Action =
  | { _tag: "Deploy"; worker: string }
  | { _tag: "Browser"; url: string; headless?: boolean; waitMs?: number }
  | { _tag: "Wait"; ms: number }
  | { _tag: "Exec"; command: string; cwd?: string; timeoutMs?: number };

export namespace Act {
  export function deploy(config: { worker: string }): Action {
    return { _tag: "Deploy", worker: config.worker };
  }

  export function browser(config: {
    url: string;
    headless?: boolean;
    waitMs?: number;
  }): Action {
    return {
      _tag: "Browser",
      url: config.url,
      headless: config.headless ?? true,
      waitMs: config.waitMs ?? 5000
    };
  }

  export function wait(ms: number): Action {
    return { _tag: "Wait", ms };
  }

  export function exec(command: string, opts?: { cwd?: string; timeoutMs?: number }): Action {
    return { _tag: "Exec", command, cwd: opts?.cwd, timeoutMs: opts?.timeoutMs };
  }
}
