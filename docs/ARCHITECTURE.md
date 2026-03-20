# BBA Intelligence Hub — Architecture

## System Overview

BBA Services OS is a multi-tenant, AI-powered bookkeeping, compliance, and funding-readiness platform built for small businesses. It exposes a unified web dashboard backed by a FastAPI engine, an Apollo GraphQL gateway, and a PostgreSQL database with Redis caching.

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                         Noble Savage Ecosystem                         │
│                                                                        │
│   Browser / GitHub Codespace                                           │
│   ┌──────────────────────────────┐                                     │
│   │  React SPA  (Vite + Router) │  :3000 (dev)  /  :80 (prod)        │
│   │  • Dashboard                │                                     │
│   │  • Upload Intelligence      │                                     │
│   │  • Monitoring Console       │                                     │
│   └──────────┬─────────────────-┘                                     │
│              │ HTTP + WebSocket                                        │
│              ▼                                                         │
│   ┌──────────────────────────────┐                                     │
│   │  Nginx Reverse Proxy        │  Handles SPA routing, API proxy,   │
│   │  (nginx.conf)               │  security headers                  │
│   └──────┬────────────┬─────────┘                                     │
│          │            │                                                │
│     /graphql      /api/v1  +  /ws                                     │
│          │            │                                                │
│          ▼            ▼                                                │
│   ┌────────────┐  ┌──────────────────────────────────────────────┐    │
│   │  Apollo    │  │  FastAPI Backend  (Python 3.12)              │    │
│   │  GraphQL   │  │  • REST endpoints (/api/v1/*)                │    │
│   │  Gateway   │  │  • WebSocket stream (/ws/system)             │    │
│   │  :4000     │  │  • Agent orchestration                       │    │
│   └─────┬──────┘  │  • AI model manager (OpenAI-compatible)      │    │
│         │  HTTP   └────────────┬──────────────────────────────┬──┘    │
│         └────────►             │                              │       │
│                                ▼                              ▼       │
│                       ┌─────────────────┐            ┌──────────────┐ │
│                       │  PostgreSQL 15  │            │  Redis 7     │ │
│                       │  (asyncpg pool) │            │  (sessions + │ │
│                       │  Row-Level Sec. │            │   cache)     │ │
│                       └─────────────────┘            └──────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Services

| Service   | Port (dev) | Language / Runtime | Description                       |
|-----------|------------|--------------------|-----------------------------------|
| Frontend  | 3000       | React 18 + Vite 5  | SPA served via Nginx              |
| Backend   | 8000       | Python 3.12 / FastAPI | REST + WebSocket AI engine     |
| GraphQL   | 4000       | Node 20 / Apollo 3 | GraphQL gateway to Backend        |
| Postgres  | 5432       | PostgreSQL 15      | Primary DB with RLS policies      |
| Redis     | 6379       | Redis 7            | Cache + session layer             |

---

## AI Agents

| Agent                    | Purpose                                                   |
|--------------------------|-----------------------------------------------------------|
| `IntakeAgent`            | Processes uploaded documents, triggers classification     |
| `FinancialAgent`         | Categorizes transactions, assesses cash flow health       |
| `FundingAgent`           | Matches clients to CDFI/SBA funding partners              |
| `ComplianceAgent`        | Checks regulatory and tax compliance status               |
| `ExecutiveStrategistAgent` | Synthesizes data into a holistic treatment plan         |
| `ModelManager`           | Manages AI provider failover (primary → secondary → third)|

All agents degrade gracefully to local fallback logic when the AI provider is unavailable.

---

## Data Flow

```
User Upload (Base64 / Text)
       │
       ▼
Frontend (UploadStore)
       │  POST /api/v1/analyze-upload
       ▼
Backend (ModelManager)
       │  → OpenAI-compatible API (configurable provider)
       ▼
Structured JSON response
       │
       ▼
Frontend renders results + streams system logs via WebSocket
```

---

## Database Schema (Key Tables)

| Table                  | Purpose                                  |
|------------------------|------------------------------------------|
| `tenants`              | Multi-tenant isolation root              |
| `clients`              | Business clients within a tenant         |
| `transactions`         | Financial transactions with AI metadata  |
| `documents`            | Uploaded documents with OCR/AI results   |
| `funding_partners`     | CDFI, SBA, and fintech partner registry  |
| `funding_applications` | Client funding application pipeline      |
| `treatment_plans`      | AI-generated action plans per client     |
| `agent_logs`           | Full audit log of all agent actions      |
| `portal_documents`     | Portal case document store               |
| `portal_thread_messages` | Case communication threads             |

All tenant-scoped tables enforce Row-Level Security (RLS) using `app.current_tenant_id`.

---

## Project Classification

| Component      | Type              | Status      | Notes                          |
|----------------|-------------------|-------------|--------------------------------|
| Frontend       | Standalone App    | Production  | React SPA + Vite               |
| Backend        | Microservice      | Production  | FastAPI, no auth yet           |
| GraphQL Gateway| Microservice      | Production  | Apollo 3 proxy                 |
| Postgres       | Shared Infra      | Production  | With RLS + seed data           |
| Redis          | Shared Infra      | Production  | Cache + sessions               |

---

## CI/CD Pipeline

Workflow: `.github/workflows/ci.yml`

```
Push / PR
   ├── Backend job  →  pip install  →  ruff lint  →  pytest tests/
   ├── Frontend job →  npm ci  →  eslint  →  vite build  →  vitest
   └── GraphQL job  →  npm install  →  node --check server.js
```

---

## Codespace Setup

See `.devcontainer/devcontainer.json` for one-click Codespace launch.

After the Codespace starts:
1. All dependencies are installed automatically.
2. Run `./scripts/dev-start.sh` to boot all services via Docker Compose.
3. Port 3000 (Frontend), 8000 (Backend), and 4000 (GraphQL) are forwarded automatically.

---

## Long-Term System Design Recommendations

1. **Authentication layer**: Add JWT or OAuth2 (e.g. Supabase Auth) to protect all backend routes.
2. **Plaid integration**: Connect `bank_accounts` and `transactions` tables to live Plaid webhooks.
3. **Document storage**: Replace `s3_key` placeholder with real S3/R2 bucket integration.
4. **Worker queue**: Move AI processing to a background task queue (Celery + Redis or ARQ) for large uploads.
5. **Observability**: Add OpenTelemetry tracing across Frontend → GraphQL → Backend.
6. **Monorepo tooling**: Consider TurboRepo or Nx to manage shared types between frontend and backend.
7. **Multi-region**: PostgreSQL with read replicas + Redis Cluster for horizontal scale.
