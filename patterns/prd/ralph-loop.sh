#!/usr/bin/env bash
set -euo pipefail

mkdir -p .ralph

if [[ -f .ralph/PAUSED ]]; then
  echo "Ralph loop paused (.ralph/PAUSED)"
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
if [[ -f .ralph/failures ]]; then
  failures="$(cat .ralph/failures)"
fi

max_failures="${RALPH_MAX_FAILURES:-5}"

while true; do
  [[ -f .ralph/PAUSED ]] && exit 0

  set +e
  output="$(bun run patterns/prd/run-prd.ts 2>&1)"
  status="$?"
  set -e

  if [[ "$status" -eq 0 ]]; then
    echo "0" > .ralph/failures
    echo "$output"
    exit 0
  fi

  failures="$((failures + 1))"
  echo "$failures" > .ralph/failures

  if [[ "$failures" -ge "$max_failures" ]]; then
    touch .ralph/PAUSED
    echo "Auto-paused after $failures failures (.ralph/PAUSED)"
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

