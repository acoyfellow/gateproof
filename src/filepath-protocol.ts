/**
 * Filepath Agent Protocol (FAP) — Gateproof integration
 *
 * Zod schemas for the NDJSON event stream between Filepath containers
 * and the Gateproof observe layer. Each agent emits structured events
 * on stdout; we parse and map them to Log entries for gate assertions.
 *
 * Protocol source: https://github.com/ACoyfellow/filepath
 */

import { z } from "zod";
import type { Log } from "./types";

// ─── Agent Status ───

export const AgentStatus = z.enum([
  "idle",
  "thinking",
  "running",
  "done",
  "error",
]);
export type AgentStatus = z.infer<typeof AgentStatus>;

// ─── Output Events (agent stdout → gateproof) ───

export const TextEvent = z.object({
  type: z.literal("text"),
  content: z.string(),
});
export type TextEvent = z.infer<typeof TextEvent>;

export const ToolEvent = z.object({
  type: z.literal("tool"),
  name: z.string(),
  path: z.string().optional(),
  status: z.enum(["start", "done", "error"]),
  output: z.string().optional(),
});
export type ToolEvent = z.infer<typeof ToolEvent>;

export const CommandEvent = z.object({
  type: z.literal("command"),
  cmd: z.string(),
  status: z.enum(["start", "done", "error"]),
  exit: z.number().optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
});
export type CommandEvent = z.infer<typeof CommandEvent>;

export const CommitEvent = z.object({
  type: z.literal("commit"),
  hash: z.string(),
  message: z.string(),
});
export type CommitEvent = z.infer<typeof CommitEvent>;

export const SpawnEvent = z.object({
  type: z.literal("spawn"),
  name: z.string(),
  agent: z.string(),
  model: z.string(),
  task: z.string().optional(),
});
export type SpawnEvent = z.infer<typeof SpawnEvent>;

export const WorkersEvent = z.object({
  type: z.literal("workers"),
  workers: z.array(
    z.object({
      name: z.string(),
      status: AgentStatus,
    }),
  ),
});
export type WorkersEvent = z.infer<typeof WorkersEvent>;

export const StatusEvent = z.object({
  type: z.literal("status"),
  state: AgentStatus,
  context_pct: z.number().min(0).max(1).optional(),
});
export type StatusEvent = z.infer<typeof StatusEvent>;

export const HandoffEvent = z.object({
  type: z.literal("handoff"),
  summary: z.string(),
});
export type HandoffEvent = z.infer<typeof HandoffEvent>;

export const DoneEvent = z.object({
  type: z.literal("done"),
  summary: z.string().optional(),
});
export type DoneEvent = z.infer<typeof DoneEvent>;

export const AgentEvent = z.discriminatedUnion("type", [
  TextEvent,
  ToolEvent,
  CommandEvent,
  CommitEvent,
  SpawnEvent,
  WorkersEvent,
  StatusEvent,
  HandoffEvent,
  DoneEvent,
]);
export type AgentEvent = z.infer<typeof AgentEvent>;

// ─── Input Messages (gateproof → agent stdin) ───

export const UserMessage = z.object({
  type: z.literal("message"),
  from: z.enum(["user", "parent", "system"]),
  content: z.string(),
});
export type UserMessage = z.infer<typeof UserMessage>;

export const SignalMessage = z.object({
  type: z.literal("signal"),
  action: z.enum(["stop", "pause", "resume"]),
});
export type SignalMessage = z.infer<typeof SignalMessage>;

export const AgentInput = z.discriminatedUnion("type", [
  UserMessage,
  SignalMessage,
]);
export type AgentInput = z.infer<typeof AgentInput>;

// ─── NDJSON Parsing ───

export function parseAgentEvent(line: string): AgentEvent | null {
  try {
    const json = JSON.parse(line);
    const result = AgentEvent.safeParse(json);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function serializeInput(input: AgentInput): string {
  return JSON.stringify(input);
}

// ─── Event → Log Mapping ───

function statusToLogStatus(status: "start" | "done" | "error"): Log["status"] {
  switch (status) {
    case "start": return "start";
    case "done": return "success";
    case "error": return "error";
  }
}

function agentStateToLogStatus(state: AgentStatus): Log["status"] {
  switch (state) {
    case "idle": return "info";
    case "thinking": return "start";
    case "running": return "start";
    case "done": return "success";
    case "error": return "error";
  }
}

/**
 * Maps a Filepath AgentEvent to a Gateproof Log entry.
 *
 * This is the bridge between the two systems: Filepath's NDJSON protocol
 * becomes observable evidence for gate assertions.
 */
export function agentEventToLog(event: AgentEvent, agentName?: string): Log {
  const base: Partial<Log> = {
    timestamp: new Date().toISOString(),
    stage: agentName ?? "agent",
  };

  switch (event.type) {
    case "text":
      return {
        ...base,
        action: "text",
        status: "info",
        data: { content: event.content },
      };

    case "tool":
      return {
        ...base,
        action: `tool:${event.name}`,
        status: statusToLogStatus(event.status),
        data: {
          name: event.name,
          ...(event.path && { path: event.path }),
          ...(event.output && { output: event.output }),
        },
      };

    case "command":
      return {
        ...base,
        action: `cmd:${event.cmd}`,
        status: statusToLogStatus(event.status),
        data: {
          cmd: event.cmd,
          ...(event.exit !== undefined && { exit: event.exit }),
          ...(event.stdout && { stdout: event.stdout }),
          ...(event.stderr && { stderr: event.stderr }),
        },
        ...(event.status === "error" && event.stderr && {
          error: {
            tag: "CommandError",
            message: event.stderr,
          },
        }),
      };

    case "commit":
      return {
        ...base,
        action: "commit",
        status: "success",
        data: { hash: event.hash, message: event.message },
      };

    case "spawn":
      return {
        ...base,
        action: "spawn",
        status: "start",
        data: {
          name: event.name,
          agent: event.agent,
          model: event.model,
          ...(event.task && { task: event.task }),
        },
      };

    case "workers":
      return {
        ...base,
        action: "workers",
        status: "info",
        data: { workers: event.workers },
      };

    case "status":
      return {
        ...base,
        action: "status",
        status: agentStateToLogStatus(event.state),
        data: {
          state: event.state,
          ...(event.context_pct !== undefined && { context_pct: event.context_pct }),
        },
      };

    case "handoff":
      return {
        ...base,
        action: "handoff",
        status: "info",
        data: { summary: event.summary },
      };

    case "done":
      return {
        ...base,
        action: "done",
        status: "success",
        data: {
          ...(event.summary && { summary: event.summary }),
        },
      };
  }
}

/**
 * Parses an NDJSON line and maps it to a Log entry.
 * Returns null for unparseable lines (graceful degradation).
 */
export function ndjsonLineToLog(line: string, agentName?: string): Log | null {
  const event = parseAgentEvent(line);
  if (!event) return null;
  return agentEventToLog(event, agentName);
}
