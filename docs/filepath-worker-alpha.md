# filepath Worker Alpha

This is an internal alpha for Gateproof's filepath-backed worker runtime.

It keeps Gateproof local and uses filepath only for isolated worker execution. Gateproof still owns:
- proof execution
- first failing gate selection
- local patch apply
- local scope validation
- local iteration commits

## Required Env

Set these before running the alpha witness:

- `GATEPROOF_FILEPATH_ENDPOINT`
  - Base filepath URL such as `https://myfilepath.com`
  - A full `/api/workspaces/:id/run` URL also works
- `GATEPROOF_FILEPATH_API_KEY`
  - filepath API key for the target account
- `GATEPROOF_FILEPATH_WORKSPACE_ID`
  - workspace pointing at a Gateproof checkout with `examples/hello-world` present
- `GATEPROOF_FILEPATH_HARNESS_ID`
  - filepath harness to run for the worker task
- `GATEPROOF_FILEPATH_MODEL`
  - model identifier for that harness
  - use `openai/gpt-4o` for the current alpha; `openai/gpt-5` currently returns empty assistant text through OpenRouter in this filepath setup

## Alpha Witness

Run:

```bash
bun run example:hello-world:filepath-worker
```

What it does:
- creates a temporary local hello-world proof repo
- defines one alpha-only hello-world gate that requires the response to become `hello from filepath`
- runs the proof loop locally with `createFilepathWorker(...)`
- requires filepath to return a unified patch from the live `/api/workspaces/:id/run` contract
- applies that patch locally with `git apply`
- reruns proof until the gate passes
- verifies the local temp repo ends at `hello from filepath`

Failure is expected if:
- filepath does not return `patch`
- the returned patch does not apply locally
- the patch escapes scope
- the filepath workspace does not point at a compatible Gateproof checkout

Current runtime truth:
- filepath worker runs execute against a fresh repo clone for the workspace, not against a shared mutable workspace filesystem
- this alpha proves the returned patch contract and local materialization path
- it does not require the filepath workspace itself to stay mutated after the run

This is intentionally not part of the public README yet.
