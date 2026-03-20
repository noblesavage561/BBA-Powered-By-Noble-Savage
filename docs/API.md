# BBA Intelligence Hub — API Reference

## Base URL

| Environment | URL                          |
|-------------|------------------------------|
| Local dev   | `http://127.0.0.1:8000`      |
| Codespace   | `https://<codespace>-8000.app.github.dev` |
| Production  | `http://127.0.0.1/api/v1` (via Nginx) |

---

## Health

### `GET /api/v1/health`

Returns basic service health including database and Redis connectivity.

**Response**
```json
{
  "status": "ok",
  "timestamp": "2026-03-20T12:00:00.000000+00:00",
  "db_connected": true,
  "redis_connected": true
}
```

---

### `GET /api/v1/system/health`

Returns detailed system health metrics used by the monitoring dashboard.

**Response**
```json
{
  "graphql": {
    "latencyMs": 52,
    "requestsPerSecond": 132.4,
    "errorRate": 0.01,
    "historicalLatency": [45, 48, 52, ...]
  },
  "database": {
    "activeConnections": 3,
    "maxConnections": 100,
    "queryRate": 14,
    "avgQueryTime": 1.2
  },
  "redis": {
    "hitRate": 0.92,
    "memoryUsedMb": 12.4,
    "memoryTotalMb": 256,
    "keysCount": 340,
    "connectedClients": 2
  },
  "agents": {
    "active": 1,
    "pending": 0,
    "completed": 47
  },
  "recent_logs": [
    {
      "timestamp": "12:00:00",
      "message": "Transaction categorized: Office Rent",
      "type": "success",
      "category": "financial"
    }
  ]
}
```

---

## Transactions

### `POST /api/v1/categorize-transaction`

Categorizes a transaction using AI (or local fallback).

**Request**
```json
{
  "transaction_id": "tx-001",
  "description": "Monthly office rent",
  "amount": 2500.00,
  "previous_context": {
    "industry": "consulting"
  }
}
```

**Response**
```json
{
  "category": "Rent or Lease",
  "confidence": 0.88,
  "is_deductible": true,
  "tax_category": "Schedule C – Line 20b",
  "reasoning": "Office rent classified as deductible business expense."
}
```

---

## Documents

### `POST /api/v1/analyze-document`

Triggers AI analysis on a stored document.

**Request**
```json
{
  "document_id": "doc-001",
  "client_id": "11111111-1111-1111-1111-111111111111",
  "tenant_id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**
```json
{
  "document_id": "doc-001",
  "status": "analyzed",
  "analysis": { ... }
}
```

---

### `POST /api/v1/analyze-upload`

Analyzes an uploaded file (image or text) using AI vision or text models.

**Request** (image)
```json
{
  "file_name": "id_card.png",
  "base64_image": "<base64>",
  "mime_type": "image/png"
}
```

**Request** (text)
```json
{
  "file_name": "credit_report.txt",
  "text_input": "Account: ... Status: Collection ..."
}
```

**Response**
```json
{
  "document_type": "Credit Report",
  "confidence_score": 0.95,
  "extracted_data": { ... },
  "action_required": "Dispute negative accounts",
  "flag_for_staff": true,
  "source": "ai"
}
```

---

## Funding

### `GET /api/v1/funding-matches/:client_id`

Returns funding partner matches for a client.

**Response**
```json
{
  "client_id": "11111111-...",
  "matches": [
    {
      "partner": { "name": "Community Capital CDFI", "type": "CDFI" },
      "match_score": 87,
      "reason": "Strong cash flow and credit score above minimum threshold."
    }
  ]
}
```

---

### `POST /api/v1/generate-treatment-plan`

Generates an AI treatment plan for a client.

**Request**
```json
{
  "client_id": "11111111-1111-1111-1111-111111111111",
  "tenant_id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**
```json
{
  "success": true,
  "treatment_plan": {
    "health_score": 72,
    "insight": "Complete documentation to improve funding readiness.",
    "items": [
      {
        "title": "Upload Latest Financial Statement",
        "description": "Ensure statement is available for underwriting review.",
        "category": "compliance",
        "priority": "high",
        "due_date": "2026-03-20"
      }
    ]
  },
  "generated_at": "2026-03-20T12:00:00.000000+00:00"
}
```

---

## Portal

### `POST /api/v1/portal/state`

Saves portal state for a tenant.

### `GET /api/v1/portal/state/:tenant_id`

Retrieves portal state for a tenant.

### `POST /api/v1/portal/documents`

Adds a document to a portal case.

### `GET /api/v1/portal/documents/:tenant_id/:case_id`

Lists documents for a portal case.

### `POST /api/v1/portal/thread`

Adds a message to a portal thread.

### `GET /api/v1/portal/thread/:tenant_id/:case_id`

Gets all messages in a portal thread.

---

## Auth

### `GET /api/v1/auth/me`

Returns mock auth data for the demo tenant.

**Response**
```json
{
  "email": "owner@demo.test",
  "role": "admin",
  "tenant_id": "00000000-0000-0000-0000-000000000001",
  "client_id": "11111111-1111-1111-1111-111111111111"
}
```

---

## WebSocket

### `WS /ws/system`

Streams real-time system health updates and log events to the frontend monitoring dashboard.

**Message Types**

```json
{ "type": "health_update", "payload": { ... } }
{ "type": "log", "payload": { "timestamp": "...", "message": "...", "type": "info", "category": "system" } }
```

---

## GraphQL Gateway

Base URL: `http://127.0.0.1:4000/`

**Queries**

```graphql
query {
  health {
    status
    timestamp
    db_connected
    redis_connected
  }
  fundingMatches(clientId: "11111111-...") {
    matches
  }
  systemHealth {
    graphql { latencyMs requestsPerSecond errorRate historicalLatency }
    database { activeConnections maxConnections queryRate avgQueryTime }
    redis { hitRate memoryUsedMb memoryTotalMb keysCount connectedClients }
    agents { active pending completed }
    recent_logs { timestamp message type category }
  }
}
```
