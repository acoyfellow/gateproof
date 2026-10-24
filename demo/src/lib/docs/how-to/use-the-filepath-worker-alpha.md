# How To: Use the filepath Worker Alpha

**Task:** hand one bounded worker turn to [filepath](https://github.com/acoyfellow/filepath). Gateproof still runs the proof.

**Done when:** the hello-world gate passes after filepath's patch is applied.

## What it does

1. Gateproof runs the proof locally and finds the first failing story.
2. filepath runs one worker task in a fresh clone of the workspace repository.
3. filepath returns a unified patch.
4. Gateproof checks the patch against the story's scope, applies it with `git apply`, and runs the proof again.

This is an alpha. The built-in worker is still the stable path.

## Configure

| Variable | Value |
| --- | --- |
| `GATEPROOF_FILEPATH_ENDPOINT` | Base filepath URL, such as `https://myfilepath.com`. A full `/api/workspaces/:id/run` URL also works. |
| `GATEPROOF_FILEPATH_API_KEY` | filepath API key for the account. |
| `GATEPROOF_FILEPATH_WORKSPACE_ID` | A workspace that points at a Gateproof checkout with `examples/hello-world`. |
| `GATEPROOF_FILEPATH_HARNESS_ID` | The filepath harness for the task. |
| `GATEPROOF_FILEPATH_MODEL` | The model. The current witness uses `openai/gpt-4o`. |

Save the model provider key in filepath itself. Today that is an OpenRouter key in filepath Settings.

## Run

```bash
bun run example:hello-world:filepath-worker
```

Success: filepath returns `status: "success"` and a non-empty `patch`, the gate reruns green, and the temporary repository ends at `hello from filepath`.

## In your own plan

```ts
Plan.runLoop(plan, {
  worker: createFilepathWorker({ endpoint, workspaceId, harnessId, model, apiKey }),
});
```

## When it fails

| Symptom | Cause |
| --- | --- |
| No `patch` returned | The worker made no change. |
| Patch does not apply | The workspace is not a compatible Gateproof checkout. |
| Scope violation | The patch touches a path outside the story's scope. |
| Provider error | The model provider key in filepath is missing or unreadable. Save it again. |
