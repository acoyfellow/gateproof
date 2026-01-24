#!/usr/bin/env bun
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type StoryScope = {
  allowedPaths?: string[];
  forbiddenPaths?: string[];
  maxChangedFiles?: number;
  maxChangedLines?: number;
};

type Story = {
  id: string;
  title: string;
  gateFile: string;
  dependsOn?: string[];
  scope?: StoryScope;
};

function fail(message: string): never {
  throw new Error(`PRD validation failed: ${message}`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validateShape(value: unknown): { stories: Story[] } {
  if (!isObject(value)) fail(`prd must be an object, got ${typeof value}`);
  const stories = (value as Record<string, unknown>).stories;
  if (!Array.isArray(stories)) fail(`prd.stories must be an array`);

  const out: Story[] = [];
  for (let i = 0; i < stories.length; i++) {
    const s = stories[i];
    if (!isObject(s)) fail(`stories[${i}] must be an object`);

    const id = s.id;
    const title = s.title;
    const gateFile = s.gateFile;
    const dependsOn = s.dependsOn;
    const scope = s.scope;

    if (typeof id !== "string" || id.length === 0) fail(`stories[${i}].id must be a non-empty string`);
    if (typeof title !== "string" || title.length === 0) fail(`stories[${i}].title must be a non-empty string`);
    if (typeof gateFile !== "string" || gateFile.length === 0) fail(`stories[${i}].gateFile must be a non-empty string`);

    if (dependsOn !== undefined) {
      if (!Array.isArray(dependsOn)) fail(`stories[${i}].dependsOn must be an array of strings`);
      for (let j = 0; j < dependsOn.length; j++) {
        if (typeof dependsOn[j] !== "string" || dependsOn[j].length === 0) {
          fail(`stories[${i}].dependsOn[${j}] must be a non-empty string`);
        }
      }
    }

    let validatedScope: StoryScope | undefined;
    if (scope !== undefined) {
      if (!isObject(scope)) fail(`stories[${i}].scope must be an object`);
      validatedScope = {};
      
      if (scope.allowedPaths !== undefined) {
        if (!Array.isArray(scope.allowedPaths)) fail(`stories[${i}].scope.allowedPaths must be an array of strings`);
        for (let j = 0; j < scope.allowedPaths.length; j++) {
          if (typeof scope.allowedPaths[j] !== "string") {
            fail(`stories[${i}].scope.allowedPaths[${j}] must be a string`);
          }
        }
        validatedScope.allowedPaths = scope.allowedPaths as string[];
      }
      
      if (scope.forbiddenPaths !== undefined) {
        if (!Array.isArray(scope.forbiddenPaths)) fail(`stories[${i}].scope.forbiddenPaths must be an array of strings`);
        for (let j = 0; j < scope.forbiddenPaths.length; j++) {
          if (typeof scope.forbiddenPaths[j] !== "string") {
            fail(`stories[${i}].scope.forbiddenPaths[${j}] must be a string`);
          }
        }
        validatedScope.forbiddenPaths = scope.forbiddenPaths as string[];
      }
      
      if (scope.maxChangedFiles !== undefined) {
        if (typeof scope.maxChangedFiles !== "number" || scope.maxChangedFiles < 0) {
          fail(`stories[${i}].scope.maxChangedFiles must be a non-negative number`);
        }
        validatedScope.maxChangedFiles = scope.maxChangedFiles;
      }
      
      if (scope.maxChangedLines !== undefined) {
        if (typeof scope.maxChangedLines !== "number" || scope.maxChangedLines < 0) {
          fail(`stories[${i}].scope.maxChangedLines must be a non-negative number`);
        }
        validatedScope.maxChangedLines = scope.maxChangedLines;
      }
    }

    out.push({
      id,
      title,
      gateFile,
      dependsOn: dependsOn as string[] | undefined,
      scope: validatedScope
    });
  }

  return { stories: out };
}

function validateIds(stories: Story[]): Map<string, Story> {
  const byId = new Map<string, Story>();
  for (const s of stories) {
    if (byId.has(s.id)) fail(`duplicate story id "${s.id}"`);
    byId.set(s.id, s);
  }
  return byId;
}

function validateDeps(byId: Map<string, Story>): void {
  for (const s of byId.values()) {
    for (const dep of s.dependsOn ?? []) {
      if (!byId.has(dep)) fail(`story "${s.id}" depends on unknown story "${dep}"`);
      if (dep === s.id) fail(`story "${s.id}" depends on itself`);
    }
  }
}

function validateNoCycles(byId: Map<string, Story>): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) fail(`dependency cycle detected involving "${id}"`);
    visiting.add(id);
    const s = byId.get(id);
    if (!s) fail(`unknown story id "${id}"`);
    for (const dep of s.dependsOn ?? []) visit(dep);
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of byId.keys()) visit(id);
}

function validateGateFiles(stories: Story[], cwd: string): void {
  for (const s of stories) {
    const abs = resolve(cwd, s.gateFile);
    if (!existsSync(abs)) fail(`missing gate file for "${s.id}": ${s.gateFile}`);
    const st = statSync(abs);
    if (!st.isFile()) fail(`gateFile must be a file for "${s.id}": ${s.gateFile}`);
  }
}

async function validateGateExportsRun(stories: Story[], cwd: string): Promise<void> {
  for (const s of stories) {
    const abs = resolve(cwd, s.gateFile);
    const mod = await import(pathToFileURL(abs).toString());
    if (typeof (mod as any).run !== "function") {
      fail(`gate file must export "run" function for "${s.id}": ${s.gateFile}`);
    }
  }
}

const cwd = process.cwd();
const prdModuleArg = process.argv[2];
const defaultPrdUrl = new URL("../prd.ts", import.meta.url);
const prdModulePath = prdModuleArg ? resolve(cwd, prdModuleArg) : fileURLToPath(defaultPrdUrl);

const prdMod = await import(pathToFileURL(prdModulePath).toString());
const prd = (prdMod as any).prd as unknown;
if (prd === undefined) fail(`"${prdModuleArg ?? "prd.ts"}" must export const prd`);

function validateScopeContradictions(stories: Story[]): void {
  for (const s of stories) {
    if (!s.scope) continue;
    const { allowedPaths, forbiddenPaths } = s.scope;
    if (!allowedPaths || !forbiddenPaths) continue;
    
    for (const allowed of allowedPaths) {
      for (const forbidden of forbiddenPaths) {
        if (allowed === forbidden || allowed.includes(forbidden) || forbidden.includes(allowed)) {
          fail(`story "${s.id}" has scope contradiction: "${allowed}" is both allowed and forbidden`);
        }
      }
    }
  }
}

const { stories } = validateShape(prd);
const byId = validateIds(stories);
validateDeps(byId);
validateNoCycles(byId);
validateScopeContradictions(stories);
validateGateFiles(stories, cwd);
await validateGateExportsRun(stories, cwd);

console.log("✅ PRD validated");
