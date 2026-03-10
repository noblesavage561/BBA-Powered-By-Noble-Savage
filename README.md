# BBA-Powered-By-Noble-Savage

Business Intelligence Suite — AI-powered bookkeeping, compliance, and funding readiness platform.

## Architecture

| Service   | Port (dev) | Description                                |
|-----------|------------|--------------------------------------------|
| Frontend  | 3000       | React SPA served by Nginx (proxies API/WS) |
| Backend   | 8000       | FastAPI – REST + WebSocket engine          |
| GraphQL   | 4000       | Apollo Server gateway                      |
| Postgres  | 5432       | Primary database with RLS                  |
| Redis     | 6379       | Cache / session layer                      |

## Local Development

### Quick Start

```bash
./scripts/dev-start.sh
```

Builds and starts all services, runs smoke tests and frontend checks.

**Endpoints:**
- Dashboard: http://127.0.0.1:3000
- Backend health: http://127.0.0.1:8000/api/v1/health
- GraphQL playground: http://127.0.0.1:4000

### Stop Services

```bash
./scripts/dev-stop.sh
```

### Codespaces

The frontend auto-detects the current origin, so it works in GitHub Codespaces without extra configuration. If the browser shows stale content:

```
https://<codespace>-3000.app.github.dev/?reset=1
```

### Verify Backend

```bash
curl http://127.0.0.1:8000/api/v1/health

curl -X POST http://127.0.0.1:8000/api/v1/categorize-transaction \
  -H "Content-Type: application/json" \
  -d '{"transaction_id":"tx-1","description":"Monthly office rent","amount":2500.00}'

curl -X POST http://127.0.0.1:4000/ \
  -H "Content-Type: application/json" \
  -d '{"query":"query { health { status db_connected redis_connected } }"}'

./scripts/smoke-test.sh
```

## Production Deployment

### 1) Create a production env file

```bash
cp .env.prod.example .env.prod
# Edit .env.prod with real secrets
```

### 2) Start production stack

```bash
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 3) Verify production health

```bash
curl http://127.0.0.1/api/v1/health
```

### 4) Apply incremental DB migrations (no volume reset)

```bash
./scripts/db-migrate.sh
```

Use this when your stack already has existing volume data and you need new portal tables without reinitializing Postgres.

## Production Hardening

- **Host allow-listing:** Backend enforces `ALLOWED_HOSTS` via TrustedHostMiddleware.
- **CORS lockdown:** `ALLOWED_ORIGINS` controls browser cross-origin access; credentials disabled by default.
- **Internal-only services:** Database, Redis, Backend, and GraphQL ports are unexposed in production; only the Nginx frontend (port 80) is public.
- **Non-root containers:** Backend and GraphQL run as unprivileged users inside Docker.
- **Healthchecks:** Every service has Docker-level healthchecks with dependency ordering.
- **Row-Level Security:** Postgres tables enforce tenant isolation via RLS policies.
- **Security headers:** Nginx sets X-Content-Type-Options, X-Frame-Options, Referrer-Policy, X-XSS-Protection, and Permissions-Policy.
- **Graceful degradation:** All agents fall back to local logic when OpenAI is unavailable.

## Upload Intelligence AI

- Endpoint: `POST /api/v1/analyze-upload`
- Uses backend proxy logic (never exposes API keys in browser).
- Uses external provider settings (`AI_BASE_URL` + `AI_API_KEY`) and a model stack fallback loop.
- Default order: `PRIMARY_MODEL` -> `SECONDARY_MODEL` -> `THIRD_MODEL`.
- Text-only path prefers `TEXT_ONLY_MODEL` first for speed.
- In production, `REQUIRE_AI_KEY=true` enforces fail-fast startup if no AI key is configured.
- If all provider calls fail, API returns a clean `System Overloaded` response payload and a fallback object.

Optional env vars:

- `AI_BASE_URL` - e.g. `https://openrouter.ai/api/v1` or `https://api.x.ai/v1`
- `AI_API_KEY` - provider API key
- `PRIMARY_MODEL`, `SECONDARY_MODEL`, `THIRD_MODEL`, `TEXT_ONLY_MODEL`
- `ENVIRONMENT` - set to `production` for production runtime behavior
- `REQUIRE_AI_KEY` - `true` to require `AI_API_KEY` at startup

### Secure Local Key Handling

Best practice for local development is to keep `.env` keyless and inject secrets at runtime:

```bash
chmod +x ./scripts/start-secure.sh
./scripts/start-secure.sh
```

This script prompts for `AI_API_KEY` (or uses an already exported one) and recreates services with the key in container runtime env only.

Verify live AI linkage in one command:

```bash
chmod +x ./scripts/verify-ai-link.sh
./scripts/verify-ai-link.sh
```

Expected success output includes: `PASS: AI linkage verified. source=ai`.