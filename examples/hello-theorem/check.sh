#!/bin/sh
set -eu
file=$1
if grep -E '(^|[^A-Za-z0-9_])sorry([^A-Za-z0-9_]|$)' "$file" >/dev/null; then
  echo "fail: $file contains sorry"
  exit 1
fi
if grep -E '(^|[^A-Za-z0-9_])axiom([^A-Za-z0-9_]|$)' "$file" >/dev/null; then
  echo "fail: $file contains axiom"
  exit 1
fi
if ! grep -q "theorem denied_302" "$file"; then
  echo "fail: $file is missing theorem denied_302"
  exit 1
fi
exec lean "$file"
