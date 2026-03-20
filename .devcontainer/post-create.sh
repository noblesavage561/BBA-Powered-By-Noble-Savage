#!/usr/bin/env bash
# Post-create script for GitHub Codespaces.
# Runs once after the container is created.
set -euo pipefail

WORKSPACE="/workspace"

echo "==> Installing Python backend dependencies..."
pip install --no-cache-dir -r "$WORKSPACE/backend/requirements.txt"
pip install --no-cache-dir pytest pytest-asyncio httpx

echo "==> Installing frontend dependencies..."
cd "$WORKSPACE/frontend"
npm install

echo "==> Installing GraphQL gateway dependencies..."
cd "$WORKSPACE/graphql"
npm install

echo "==> Configuring environment..."
if [[ ! -f "$WORKSPACE/.env" ]]; then
  cp "$WORKSPACE/.env.example" "$WORKSPACE/.env"
  echo "Created .env from .env.example — update AI_API_KEY if needed."
fi

echo "==> Making scripts executable..."
chmod +x "$WORKSPACE/scripts/"*.sh

echo "==> Codespace environment ready."
echo "    Start all services: ./scripts/dev-start.sh"
echo "    Frontend:  http://localhost:3000"
echo "    Backend:   http://localhost:8000/api/v1/health"
echo "    GraphQL:   http://localhost:4000"
