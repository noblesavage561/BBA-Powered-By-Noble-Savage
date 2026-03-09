#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for i in {1..30}; do
	if curl -sS http://127.0.0.1:8000/api/v1/health >/dev/null 2>&1 && curl -sS http://127.0.0.1:4000/ >/dev/null 2>&1; then
		break
	fi
	sleep 1
done

health_json="$(curl -sS http://127.0.0.1:8000/api/v1/health)"
doc_json="$(curl -sS -X POST http://127.0.0.1:8000/api/v1/analyze-document -H "Content-Type: application/json" -d '{"document_id":"smoke-doc","client_id":"11111111-1111-1111-1111-111111111111","tenant_id":"00000000-0000-0000-0000-000000000001"}')"
funding_json="$(curl -sS http://127.0.0.1:8000/api/v1/funding-matches/11111111-1111-1111-1111-111111111111)"
categorize_json="$(curl -sS -X POST http://127.0.0.1:8000/api/v1/categorize-transaction -H "Content-Type: application/json" -d '{"transaction_id":"smoke-tx","description":"Monthly office rent","amount":2500.00,"previous_context":{"industry":"consulting"}}')"
treatment_json="$(curl -sS -X POST http://127.0.0.1:8000/api/v1/generate-treatment-plan -H "Content-Type: application/json" -d '{"client_id":"11111111-1111-1111-1111-111111111111","tenant_id":"00000000-0000-0000-0000-000000000001"}')"

graphql_json="$(curl -sS -X POST http://127.0.0.1:4000/ -H "Content-Type: application/json" -d '{"query":"query { health { status db_connected redis_connected } fundingMatches(clientId: \"11111111-1111-1111-1111-111111111111\") { matches } }"}')"

echo "REST health: $health_json"
echo "REST analyze-document: $doc_json"
echo "REST funding-matches: $funding_json"
echo "REST categorize-transaction: $categorize_json"
echo "REST generate-treatment-plan: $treatment_json"
echo "GraphQL query: $graphql_json"

if [[ "$health_json" == *"Internal Server Error"* || "$doc_json" == *"Internal Server Error"* || "$funding_json" == *"Internal Server Error"* || "$categorize_json" == *"Internal Server Error"* || "$treatment_json" == *"Internal Server Error"* || "$graphql_json" == *"Internal Server Error"* ]]; then
	echo "Smoke test failed: one or more endpoints returned Internal Server Error."
	exit 1
fi

echo "Smoke test complete."
