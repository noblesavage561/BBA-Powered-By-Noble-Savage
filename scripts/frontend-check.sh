#!/usr/bin/env bash
set -euo pipefail

for i in {1..30}; do
  if curl -sS http://127.0.0.1:3000/ >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

html="$(curl -sS http://127.0.0.1:3000/)"

if [[ "$html" != *"BBA Services OS Frontend Health"* ]]; then
  echo "Frontend check failed: expected marker text not found"
  exit 1
fi

echo "Frontend check passed."
