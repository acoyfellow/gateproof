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
   * When true, auto-fail the gate if no positive proof is collected.
   * Positive proof means at least one log with an action or stage field.
   * Default: false (for backward compatibility).
   */
  requirePositiveSignal?: boolean;

  // ─── Hierarchy (Phase 2) ───

  /**
   * Parent story ID — creates a tree of stories.
   * Mirrors Filepath's agent_node parentId pattern.
   * A story with a parentId is a child/sub-task of the parent story.
   */
  parentId?: TId;

  /**
   * Inline child stories — alternative to parentId for defining
   * the tree declaratively. Children inherit parent scope unless overridden.
   */
  children?: Story<TId>[];

  // ─── Authority (Phase 2) ───

  /**
   * Authority policy for this story — who/what can execute it,
   * what tools are allowed, what scope restrictions apply.
   */
  authority?: StoryAuthority;
};

/**
 * Authority policy for a story — governance surface.
 *
 * Controls what an agent can do while making this story true.
 * Think of it as the "permissions" around this checkpoint.
 */
export interface StoryAuthority {
  /**
   * Which agent runtimes are allowed to execute this story.
   * Empty array or undefined means any agent can run it.
   */
  allowedAgents?: string[];

  /**
   * Which models are allowed for agent execution.
   * Undefined means any model is acceptable.
   */
  allowedModels?: string[];

  /**
   * Maximum number of child agents this story can spawn.
   * Prevents runaway agent trees. Default: 0 (no spawning).
   */
  maxChildAgents?: number;

  /**
   * Maximum wall-clock time for the story's gate in ms.
   * Overrides the gate-level timeout.
   */
  maxDurationMs?: number;

  /**
   * Whether the agent can make git commits.
   * Default: true for agent-executed stories.
   */
  canCommit?: boolean;

  /**
   * Whether the agent can spawn child agents.
   * Default: false — must be explicitly enabled.
   */
  canSpawn?: boolean;

  /**
   * Allowed tool names for the agent (Filepath ToolEvent names).
   * Undefined means all tools are allowed.
   */
  allowedTools?: string[];

  /**
   * Forbidden tool names — takes precedence over allowedTools.
   */
  forbiddenTools?: string[];

  /**
   * Human approval required before executing this story.
   * When true, the gate will not run until explicitly approved.
   */
  requiresApproval?: boolean;
}

export type Prd<TId extends string = string> = {
  /**
   * The ordered source of truth for what the software should become.
   */
  stories: readonly Story<TId>[];

  /**
   * Default authority policy applied to all stories in this PRD.
   * Individual story authority settings override these defaults.
   */
  defaultAuthority?: StoryAuthority;
};

export type GateResult = {
  status: "success" | "failed" | "timeout";
  [key: string]: unknown;
};
