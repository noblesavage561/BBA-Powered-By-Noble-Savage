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
```

### Stop Services

```bash
docker compose down
```
