#!/usr/bin/env bash
set -euo pipefail

mkdir -p .agent-iteration

if [[ -f .agent-iteration/PAUSED ]]; then
  echo "Agent iteration loop paused (.agent-iteration/PAUSED)"
  exit 0
fi

if ! git diff --quiet; then
  echo "Working tree is dirty. Commit/stash first."
  exit 1
fi

if ! command -v claude >/dev/null; then
  echo "Missing agent CLI: claude"
  exit 1
fi

failures=0
if [[ -f .agent-iteration/failures ]]; then
  failures="$(cat .agent-iteration/failures)"
fi

max_failures="${AGENT_ITERATION_MAX_FAILURES:-5}"

while true; do
  [[ -f .agent-iteration/PAUSED ]] && exit 0

  set +e
  output="$(bun run patterns/prd/run-prd.ts 2>&1)"
  status="$?"
  set -e

  if [[ "$status" -eq 0 ]]; then
    echo "0" > .agent-iteration/failures
    echo "$output"
    exit 0
  fi

  failures="$((failures + 1))"
  echo "$failures" > .agent-iteration/failures

  if [[ "$failures" -ge "$max_failures" ]]; then
    touch .agent-iteration/PAUSED
    echo "Auto-paused after $failures failures (.agent-iteration/PAUSED)"
    exit 1
  fi

  before="$(git rev-parse HEAD)"
  printf "%s\n\n%s\n" "$(cat AGENTS.md)" "$output" | claude --dangerously-skip-permissions --print

  if git diff --quiet; then
    echo "No changes detected (guardrail)."
    exit 1
  fi

  echo "Loop iteration complete (head=$before). Re-running PRD..."
done

