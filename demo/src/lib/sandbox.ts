import { getSandbox } from "@cloudflare/sandbox";

type Environment = {
  Sandbox?: unknown;
  DEV?: boolean;
};

type SandboxErrorInfo = {
  name?: string;
  message: string;
  stack?: string;
  cause?: string;
  status?: number;
  statusText?: string;
  code?: string;
};

type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  isRetryable?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
};

const retryableStatusCodes = new Set([408, 429, 500, 502, 503, 504]);

const isObjectLike = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const coerceNumber = (value: unknown) =>
  typeof value === "number" ? value : Number.isFinite(Number(value)) ? Number(value) : undefined;

export function summarizeSandboxError(error: unknown): SandboxErrorInfo {
  if (error instanceof Error) {
    const info: SandboxErrorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause instanceof Error ? error.cause.message : typeof error.cause === "string" ? error.cause : undefined,
    };

    if (isObjectLike(error)) {
      const status = coerceNumber(error.status);
      if (status !== undefined) info.status = status;
      if (typeof error.statusText === "string") info.statusText = error.statusText;
      if (typeof error.code === "string") info.code = error.code;
    }

    return info;
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (isObjectLike(error)) {
    const message = typeof error.message === "string" ? error.message : "Unknown sandbox error";
    const status = coerceNumber(error.status);
    return {
      message,
      status,
      statusText: typeof error.statusText === "string" ? error.statusText : undefined,
      code: typeof error.code === "string" ? error.code : undefined,
    };
  }

  return { message: "Unknown sandbox error" };
}

export function isRetryableSandboxError(error: unknown) {
  const info = summarizeSandboxError(error);
  if (info.status && retryableStatusCodes.has(info.status)) return true;
  const message = info.message.toLowerCase();
  return message.includes("sandboxerror") ||
    message.includes("http error") ||
    message.includes("timeout") ||
    message.includes("econnreset");
}

export async function withSandboxRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}) {
  const {
    retries = 2,
    baseDelayMs = 750,
    maxDelayMs = 4000,
    isRetryable = isRetryableSandboxError,
    onRetry,
  } = options;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= retries || !isRetryable(error)) {
        throw error;
      }
      const delayMs = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      onRetry?.(error, attempt + 1, delayMs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("Sandbox retry loop exhausted");
}

/**
 * Get sandbox in a way that works in both local dev and production.
 * In local dev, returns a mock sandbox that throws informative errors.
 * In production, uses the actual env.Sandbox binding.
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ReadinessOptions = {
  attempts?: number;
  delayMs?: number;
};

async function pollSandboxReady(sandbox: Awaited<ReturnType<typeof getSandbox>>, options: ReadinessOptions = {}) {
  const { attempts = 12, delayMs = 1500 } = options;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await sandbox.listFiles("/", { recursive: false });
      return;
    } catch (error) {
      if (attempt === attempts - 1) {
        throw error;
      }
      await delay(delayMs);
    }
  }
}

export async function ensureSandboxReady(sandbox: Awaited<ReturnType<typeof getSandbox>>, options?: ReadinessOptions) {
  await pollSandboxReady(sandbox, options);
}

export async function getSandboxSafely(env: Environment, sandboxId: string, options?: object) {
  const isLocalDev = env.DEV || !env.Sandbox;

  if (isLocalDev) {
    throw new Error(
      "Sandbox endpoints are not available in local development.\n" +
      "Sandbox bindings (env.Sandbox) require a Cloudflare production environment.\n\n" +
      "To test sandbox endpoints:\n" +
      "1. Run: bun run alchemy deploy\n" +
      "2. Test endpoints on: https://gateproof.dev/api/prd/run\n" +
      "3. Or use bun run prd:loop which handles this automatically."
    );
  }

  return getSandbox(env.Sandbox as any, sandboxId, options);
}
