#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${AI_API_KEY:-}" ]]; then
  read -r -s -p "Enter AI_API_KEY: " AI_API_KEY
  echo
fi

if [[ -z "${AI_API_KEY}" ]]; then
  echo "AI_API_KEY is required."
  exit 1
fi

echo "Starting stack with runtime-injected AI key..."
AI_API_KEY="$AI_API_KEY" docker compose up -d --force-recreate backend graphql frontend db redis

echo "Done. Backend has runtime key, .env stays keyless."
