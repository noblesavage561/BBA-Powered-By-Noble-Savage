# BBA-Powered-By-Noble-Savage
Business Intelligence Suite 

## Local Development

### Run With Docker Compose

```bash
docker compose up --build -d
```

### Verify Backend

```bash
curl http://127.0.0.1:8000/api/v1/health
curl -X POST http://127.0.0.1:8000/api/v1/analyze-document \
	-H "Content-Type: application/json" \
	-d '{"document_id":"doc-1","client_id":"client-1","tenant_id":"tenant-1"}'

curl -X POST http://127.0.0.1:4000/ \
  -H "Content-Type: application/json" \
  -d '{"query":"query { health { status db_connected redis_connected } }"}'

./scripts/smoke-test.sh

# Frontend review page
curl -I http://127.0.0.1:3000/
```

### Stop Services

```bash
docker compose down
```

## Production Deployment Baseline

### 1) Create a production env file

```bash
cp .env.prod.example .env.prod
```

Populate all required values in `.env.prod` before deployment.

### 2) Start production profile

```bash
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 3) Verify production health

```bash
curl http://127.0.0.1/api/v1/health
```

## Production Hardening Decisions

- The backend now enforces host allow-listing via `ALLOWED_HOSTS`.
- CORS is environment-driven via `ALLOWED_ORIGINS`, with credentials disabled by default.
- Database and Redis host ports are not exposed in the production compose override.
- Backend and GraphQL are internal-only in production; frontend is exposed on port 80.
