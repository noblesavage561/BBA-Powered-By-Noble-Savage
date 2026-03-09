#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

echo "Starting local stack..."
docker compose up --build -d

echo "Running smoke test..."
./scripts/smoke-test.sh

echo "Running frontend check..."
./scripts/frontend-check.sh

echo
echo "Local environment is ready."
echo "Frontend: http://127.0.0.1:3000"
echo "Backend health: http://127.0.0.1:8000/api/v1/health"
echo "GraphQL via frontend: http://127.0.0.1:3000/graphql"
