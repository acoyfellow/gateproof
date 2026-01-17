import { Effect } from "effect";
import { GateError } from "./index";

export function validateWorkerName(name: string): Effect.Effect<string, GateError> {
  if (!name || typeof name !== "string") {
    return Effect.fail(new GateError({ cause: new Error("Worker name must be a non-empty string") }));
  }
  if (!/^[a-z0-9_-]+$/i.test(name)) {
    return Effect.fail(new GateError({ cause: new Error("Worker name contains invalid characters") }));
  }
  return Effect.succeed(name);
}

export function validateUrl(url: string): Effect.Effect<string, GateError> {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return Effect.fail(new GateError({ cause: new Error("URL must use http or https protocol") }));
    }
    return Effect.succeed(url);
  } catch {
    return Effect.fail(new GateError({ cause: new Error("Invalid URL format") }));
  }
}

export function validateCommand(command: string): Effect.Effect<string, GateError> {
  if (!command || typeof command !== "string") {
    return Effect.fail(new GateError({ cause: new Error("Command must be a non-empty string") }));
  }
  const dangerous = /[;&|`$(){}[\]<>]/;
  if (dangerous.test(command)) {
    return Effect.fail(new GateError({ cause: new Error("Command contains dangerous characters") }));
  }
  return Effect.succeed(command);
}
