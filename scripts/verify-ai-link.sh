#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:8000}"

health_json="$(curl -sS "${API_BASE_URL}/api/v1/health")"

health_status="$(python - <<'PY' "$health_json"
import json
import sys

payload = json.loads(sys.argv[1])
print(payload.get("status", "unknown"))
PY
)"

if [[ "$health_status" != "healthy" ]]; then
  echo "FAIL: Backend is not healthy at ${API_BASE_URL}"
  exit 2
fi

analysis_json="$(curl -sS -X POST "${API_BASE_URL}/api/v1/analyze-upload" \
  -H 'Content-Type: application/json' \
  -d '{"file_name":"utility_bill.txt","text_input":"Utility bill for Bruce B at 123 Main St, provider GridPower, date 2026-03-01","mime_type":"text/plain"}')"

parsed="$(python - <<'PY' "$analysis_json"
import json
import sys

payload = json.loads(sys.argv[1])
print(payload.get("source", ""))
print(payload.get("model", ""))
print(payload.get("message", ""))
PY
)"

source="$(echo "$parsed" | sed -n '1p')"
model="$(echo "$parsed" | sed -n '2p')"
message="$(echo "$parsed" | sed -n '3p')"

if [[ "$source" == "ai" ]]; then
  echo "PASS: AI linkage verified. source=${source} model=${model:-unknown}"
  exit 0
fi

echo "FAIL: AI linkage not active. source=${source:-unknown}"
if [[ -n "$message" ]]; then
  echo "Detail: $message"
fi
exit 1
