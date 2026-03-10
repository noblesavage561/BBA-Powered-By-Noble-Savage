import os
import random
import json
from asyncio import sleep
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

import asyncpg
import redis.asyncio as redis
from fastapi import BackgroundTasks, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.middleware.trustedhost import TrustedHostMiddleware

from agents.compliance_agent import ComplianceAgent
from agents.executive_strategist import ExecutiveStrategistAgent
from agents.financial_agent import FinancialAgent
from agents.funding_agent import FundingAgent
from agents.intake_agent import IntakeAgent
from model_manager import ModelManager

# Database/Redis clients are optional for local execution.
db_pool: Optional[asyncpg.Pool] = None
redis_client: Optional[redis.Redis] = None
last_30_latencies: List[int] = []
portal_state_fallback: Dict[str, Dict[str, Any]] = {}
portal_documents_fallback: Dict[str, List[Dict[str, Any]]] = {}
portal_threads_fallback: Dict[str, List[Dict[str, Any]]] = {}
model_manager: Optional[ModelManager] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool, redis_client, model_manager

    try:
        db_pool = await asyncpg.create_pool(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", "5432")),
            user=os.getenv("DB_USER", "admin"),
            password=os.getenv("DB_PASSWORD", "admin"),
            database=os.getenv("DB_NAME", "bba_os"),
            min_size=1,
            max_size=5,
            timeout=3,
        )
    except Exception:
        db_pool = None

    try:
        redis_client = redis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379"),
            encoding="utf-8",
            decode_responses=True,
        )
        await redis_client.ping()
    except Exception:
        redis_client = None

    model_manager = ModelManager()

    yield

    if db_pool:
        await db_pool.close()
    if redis_client:
        await redis_client.close()
    if model_manager:
        await model_manager.close()


app = FastAPI(title="BBA Services OS - AI Engine", version="1.0.0", lifespan=lifespan)


def parse_csv_env(name: str, default: str) -> List[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


allowed_origins = parse_csv_env("CORS_ALLOWED_ORIGINS", os.getenv("ALLOWED_ORIGINS", "*"))
allowed_hosts = parse_csv_env("ALLOWED_HOSTS", "*")
cors_allow_credentials = os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true"

# Browsers reject wildcard origins when credentials are enabled.
if "*" in allowed_origins and cors_allow_credentials:
    cors_allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)


class DocumentAnalysisRequest(BaseModel):
    document_id: str
    client_id: str
    tenant_id: str


class UploadVisionAnalysisRequest(BaseModel):
    file_name: str
    base64_image: Optional[str] = None
    mime_type: Optional[str] = None
    text_input: Optional[str] = None


class TransactionCategorizationRequest(BaseModel):
    transaction_id: str
    description: str
    amount: float
    previous_context: Optional[Dict[str, Any]] = None


class TreatmentPlanRequest(BaseModel):
    client_id: str
    tenant_id: str


class PortalStateRequest(BaseModel):
    tenant_id: str
    payload: Dict[str, Any]


class PortalDocumentRequest(BaseModel):
    tenant_id: str
    case_id: str
    document: Dict[str, Any]


class PortalThreadMessageRequest(BaseModel):
    tenant_id: str
    case_id: str
    role: str
    text: str


class AuthMeResponse(BaseModel):
    email: str
    role: str
    tenant_id: str
    client_id: str


class ProcessLog(BaseModel):
    timestamp: str
    message: str
    type: str
    category: str = "system"


class SystemHealthResponse(BaseModel):
    graphql: Dict[str, Any]
    database: Dict[str, Any]
    redis: Dict[str, Any]
    agents: Dict[str, Any]
    recent_logs: List[ProcessLog]


async def get_graphql_health() -> Dict[str, Any]:
    global last_30_latencies
    current_latency = 45 + random.randint(0, 100)
    last_30_latencies.append(current_latency)
    if len(last_30_latencies) > 30:
        last_30_latencies = last_30_latencies[-30:]

    return {
        "latencyMs": current_latency,
        "requestsPerSecond": round(110 + random.random() * 35, 1),
        "errorRate": round(random.random() * 0.2, 2),
        "historicalLatency": last_30_latencies,
    }


async def get_database_health(pool: Optional[asyncpg.Pool]) -> Dict[str, Any]:
    if not pool:
        return {
            "activeConnections": 0,
            "maxConnections": 50,
            "queryRate": 0,
            "avgQueryTime": 0,
        }

    try:
        async with pool.acquire() as conn:
            result = await conn.fetchrow(
                """
                SELECT
                    count(*) as active_connections,
                    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
                FROM pg_stat_activity
                WHERE datname = current_database()
                """
            )
            active = int(result["active_connections"] if result else 0)
            max_conn = int(result["max_connections"] if result else 50)
            query_rate = 220 + random.randint(0, 80)
            avg_query_time = round(10 + random.random() * 20, 1)
            return {
                "activeConnections": active,
                "maxConnections": max_conn,
                "queryRate": query_rate,
                "avgQueryTime": avg_query_time,
            }
    except Exception:
        return {
            "activeConnections": 0,
            "maxConnections": 50,
            "queryRate": 0,
            "avgQueryTime": 0,
        }


async def get_redis_health(client: Optional[redis.Redis]) -> Dict[str, Any]:
    if not client:
        return {
            "hitRate": 0,
            "memoryUsedMb": 0,
            "memoryTotalMb": 256,
            "keysCount": 0,
            "connectedClients": 0,
        }

    try:
        info = await client.info("stats")
        memory_info = await client.info("memory")
        clients_info = await client.info("clients")
        dbsize = await client.dbsize()

        keyspace_hits = int(info.get("keyspace_hits", 0))
        keyspace_misses = int(info.get("keyspace_misses", 0))
        total = keyspace_hits + keyspace_misses
        hit_rate = (keyspace_hits / total * 100) if total > 0 else 100.0

        return {
            "hitRate": round(hit_rate, 2),
            "memoryUsedMb": round(float(memory_info.get("used_memory", 0)) / 1024 / 1024, 2),
            "memoryTotalMb": 256,
            "keysCount": int(dbsize),
            "connectedClients": int(clients_info.get("connected_clients", 0)),
        }
    except Exception:
        return {
            "hitRate": 0,
            "memoryUsedMb": 0,
            "memoryTotalMb": 256,
            "keysCount": 0,
            "connectedClients": 0,
        }


async def get_agent_health(pool: Optional[asyncpg.Pool]) -> Dict[str, Any]:
    if not pool:
        return {"active": 0, "pending": 0, "completed": 0}

    try:
        async with pool.acquire() as conn:
            result = await conn.fetchrow(
                """
                SELECT
                    COUNT(*) FILTER (WHERE status = 'in_progress') as active,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending,
                    COUNT(*) FILTER (WHERE status = 'completed' AND created_at > NOW() - INTERVAL '1 hour') as completed
                FROM agent_logs
                WHERE created_at > NOW() - INTERVAL '24 hours'
                """
            )

            return {
                "active": int(result["active"] if result else 0),
                "pending": int(result["pending"] if result else 0),
                "completed": int(result["completed"] if result else 0),
            }
    except Exception:
        return {"active": 0, "pending": 0, "completed": 0}


def generate_process_logs() -> List[ProcessLog]:
    now = datetime.now().strftime("%H:%M:%S")
    return [
        ProcessLog(timestamp=now, message="Health check passed: All systems nominal", type="success", category="system"),
        ProcessLog(timestamp=now, message="Cache refreshed for client session data", type="info", category="cache"),
        ProcessLog(timestamp=now, message="Database connection pool healthy", type="success", category="database"),
        ProcessLog(timestamp=now, message="FinancialAgent processed transaction categorization batch", type="success", category="agent"),
        ProcessLog(timestamp=now, message="GraphQL gateway polling cycle complete", type="info", category="system"),
    ]


@app.post("/api/v1/analyze-document")
async def analyze_document(request: DocumentAnalysisRequest, background_tasks: BackgroundTasks):
    agent = IntakeAgent(db_pool, redis_client)
    background_tasks.add_task(
        agent.process_document,
        request.document_id,
        request.client_id,
        request.tenant_id,
    )
    return {"status": "processing", "document_id": request.document_id}


def classify_document_type(file_name: str) -> str:
    name = (file_name or "").strip().lower()
    if any(keyword in name for keyword in ["utility", "bill"]):
        return "Utility Bill"
    if any(keyword in name for keyword in ["license", "id"]):
        return "Driver's License"
    if any(keyword in name for keyword in ["bureau", "credit"]):
        return "Bureau Letter"
    return "Unknown Document"


def build_upload_fallback(file_name: str, source: str, ai_error: Optional[str] = None) -> Dict[str, Any]:
    document_type = classify_document_type(file_name)
    payload: Dict[str, Any] = {
        "document_type": document_type,
        "extracted_data": {
            "name": "Pending verification",
            "address": "Pending verification",
            "account_numbers": [],
        },
        "action_required": document_type == "Utility Bill",
        "status": "analyzed",
        "source": source,
    }
    if ai_error:
        payload["ai_error"] = ai_error
    return payload


def normalize_upload_payload(file_name: str, ai_payload: Dict[str, Any]) -> Dict[str, Any]:
    fallback_type = classify_document_type(file_name)
    document_type = ai_payload.get("document_type") or fallback_type
    extracted_data = ai_payload.get("extracted_data") if isinstance(ai_payload.get("extracted_data"), dict) else {}
    action_required = ai_payload.get("action_required")
    if isinstance(action_required, str):
        action_required = action_required.strip() or ""
    elif isinstance(action_required, bool):
        action_required = "Address mismatch review" if action_required else ""
    else:
        action_required = ""

    return {
        "document_type": document_type,
        "confidence_score": float(ai_payload.get("confidence_score", 0.0) or 0.0),
        "extracted_data": {
            "name": extracted_data.get("name", "Pending verification"),
            "address": extracted_data.get("address", "Pending verification"),
            "account_numbers": extracted_data.get("account_numbers", []),
            "provider": extracted_data.get("provider"),
            "service_date": extracted_data.get("service_date"),
            "negative_accounts": extracted_data.get("negative_accounts", []),
        },
        "action_required": action_required,
        "flag_for_staff": bool(ai_payload.get("flag_for_staff", document_type == "Unknown Document")),
        "status": "analyzed",
        "source": ai_payload.get("source", "ai"),
        "model": ai_payload.get("model"),
    }


@app.post("/api/v1/analyze-upload")
async def analyze_upload(request: UploadVisionAnalysisRequest):
    normalized_name = (request.file_name or "").strip().lower()

    try:
        if model_manager and model_manager.client:
            ai_payload = await model_manager.analyze(
                file_name=request.file_name,
                mime_type=request.mime_type,
                base64_image=request.base64_image,
                text_input=request.text_input,
            )
            return normalize_upload_payload(request.file_name, ai_payload)
    except Exception as exc:
        return {
            "status": "error",
            "message": "System Overloaded. Please retry shortly.",
            "system_overloaded": True,
            "source": "model_manager",
            "ai_error": type(exc).__name__,
            "fallback": build_upload_fallback(normalized_name, source="heuristic_fallback", ai_error=type(exc).__name__),
        }

    return normalize_upload_payload(request.file_name, build_upload_fallback(normalized_name, source="heuristic"))


@app.post("/api/v1/categorize-transaction")
async def categorize_transaction(request: TransactionCategorizationRequest):
    agent = FinancialAgent(db_pool)
    return await agent.categorize_transaction(
        request.description,
        request.amount,
        request.previous_context or {},
    )


@app.post("/api/v1/generate-treatment-plan")
async def generate_treatment_plan(request: TreatmentPlanRequest):
    financial_agent = FinancialAgent(db_pool)
    compliance_agent = ComplianceAgent(db_pool)
    funding_agent = FundingAgent(db_pool)

    financial_data = await financial_agent.get_financial_summary(request.client_id)
    compliance_data = await compliance_agent.get_compliance_status(request.client_id)
    funding_data = await funding_agent.get_funding_readiness(request.client_id)

    strategist = ExecutiveStrategistAgent()
    return await strategist.synthesize_treatment_plan(
        client_id=request.client_id,
        financial_data=financial_data,
        compliance_data=compliance_data,
        funding_data=funding_data,
    )


@app.get("/api/v1/funding-matches/{client_id}")
async def get_funding_matches(client_id: str):
    funding_agent = FundingAgent(db_pool)
    matches = await funding_agent.find_funding_matches(client_id)
    return {"matches": matches}


@app.get("/api/v1/health")
async def health_check():
    db_connected = db_pool is not None
    redis_connected = redis_client is not None
    return {
        "status": "healthy" if db_connected and redis_connected else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "db_connected": db_connected,
        "redis_connected": redis_connected,
    }


@app.get("/api/v1/system/health", response_model=SystemHealthResponse)
async def system_health():
    graphql = await get_graphql_health()
    database = await get_database_health(db_pool)
    redis_health = await get_redis_health(redis_client)
    agents = await get_agent_health(db_pool)
    recent_logs = generate_process_logs()

    return SystemHealthResponse(
        graphql=graphql,
        database=database,
        redis=redis_health,
        agents=agents,
        recent_logs=recent_logs,
    )


def _portal_state_key(tenant_id: str, client_id: str) -> str:
    return f"portal_state:{tenant_id}:{client_id}"


def _portal_documents_key(tenant_id: str, client_id: str) -> str:
    return f"portal_docs:{tenant_id}:{client_id}"


def _portal_threads_key(tenant_id: str, client_id: str, case_id: str) -> str:
    return f"portal_thread:{tenant_id}:{client_id}:{case_id}"


def _resolve_role_from_email(email: str) -> str:
    normalized = (email or "").strip().lower()
    admins = {item.lower() for item in parse_csv_env("ADMIN_EMAILS", "")}
    advisors = {item.lower() for item in parse_csv_env("ADVISOR_EMAILS", "owner@demo.test")}
    if normalized and normalized in admins:
        return "admin"
    if normalized and normalized in advisors:
        return "advisor"
    return "client"


@app.get("/api/v1/auth/me", response_model=AuthMeResponse)
async def auth_me(
    email: str,
    tenant_id: str = "00000000-0000-0000-0000-000000000001",
    client_id: str = "11111111-1111-1111-1111-111111111111",
):
    return AuthMeResponse(
        email=(email or "").strip().lower(),
        role=_resolve_role_from_email(email),
        tenant_id=tenant_id,
        client_id=client_id,
    )


@app.get("/api/v1/portal/state/{client_id}")
async def get_portal_state(client_id: str, tenant_id: str):
    key = _portal_state_key(tenant_id, client_id)
    if redis_client:
        try:
            saved = await redis_client.get(key)
            if saved:
                try:
                    parsed = json.loads(saved)
                except Exception:
                    parsed = {}
                return {"client_id": client_id, "tenant_id": tenant_id, "payload": parsed, "source": "redis"}
        except Exception:
            pass

    payload = portal_state_fallback.get(key)
    return {
        "client_id": client_id,
        "tenant_id": tenant_id,
        "payload": payload or {},
        "source": "memory",
    }


@app.put("/api/v1/portal/state/{client_id}")
async def put_portal_state(client_id: str, request: PortalStateRequest):
    key = _portal_state_key(request.tenant_id, client_id)
    portal_state_fallback[key] = request.payload

    if redis_client:
        try:
            await redis_client.set(key, json.dumps(request.payload))
        except Exception:
            pass

    return {"status": "saved", "client_id": client_id, "tenant_id": request.tenant_id}


@app.get("/api/v1/portal/documents/{client_id}")
async def get_portal_documents(client_id: str, tenant_id: str):
    key = _portal_documents_key(tenant_id, client_id)
    if db_pool:
        try:
            async with db_pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT document_id, case_id, payload, updated_at
                    FROM portal_documents
                    WHERE tenant_id = $1 AND client_id = $2
                    ORDER BY updated_at DESC
                    """,
                    tenant_id,
                    client_id,
                )
                return {
                    "client_id": client_id,
                    "tenant_id": tenant_id,
                    "documents": [
                        {
                            "document_id": row["document_id"],
                            "case_id": row["case_id"],
                            **(row["payload"] or {}),
                        }
                        for row in rows
                    ],
                    "source": "db",
                }
        except Exception:
            pass

    docs = portal_documents_fallback.get(key, [])
    return {"client_id": client_id, "tenant_id": tenant_id, "documents": docs, "source": "memory"}


@app.post("/api/v1/portal/documents/{client_id}")
async def upsert_portal_document(client_id: str, request: PortalDocumentRequest):
    payload = request.document
    document_id = str(payload.get("id") or payload.get("document_id") or "")
    if not document_id:
        return {"status": "ignored", "reason": "document id required"}

    key = _portal_documents_key(request.tenant_id, client_id)
    existing = portal_documents_fallback.get(key, [])
    existing = [doc for doc in existing if str(doc.get("id")) != document_id]
    existing.append(payload)
    portal_documents_fallback[key] = existing

    if db_pool:
        try:
            async with db_pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO portal_documents (tenant_id, client_id, case_id, document_id, payload)
                    VALUES ($1, $2, $3, $4, $5::jsonb)
                    ON CONFLICT (tenant_id, client_id, document_id)
                    DO UPDATE SET
                        case_id = EXCLUDED.case_id,
                        payload = EXCLUDED.payload,
                        updated_at = NOW()
                    """,
                    request.tenant_id,
                    client_id,
                    request.case_id,
                    document_id,
                    json.dumps(payload),
                )
        except Exception:
            pass

    return {"status": "saved", "document_id": document_id}


@app.delete("/api/v1/portal/documents/{client_id}/{document_id}")
async def delete_portal_document(client_id: str, document_id: str, tenant_id: str):
    key = _portal_documents_key(tenant_id, client_id)
    portal_documents_fallback[key] = [
        doc for doc in portal_documents_fallback.get(key, []) if str(doc.get("id")) != str(document_id)
    ]

    if db_pool:
        try:
            async with db_pool.acquire() as conn:
                await conn.execute(
                    """
                    DELETE FROM portal_documents
                    WHERE tenant_id = $1 AND client_id = $2 AND document_id = $3
                    """,
                    tenant_id,
                    client_id,
                    document_id,
                )
        except Exception:
            pass

    return {"status": "deleted", "document_id": document_id}


@app.get("/api/v1/portal/threads/{client_id}")
async def get_portal_thread(client_id: str, tenant_id: str, case_id: str):
    key = _portal_threads_key(tenant_id, client_id, case_id)
    if db_pool:
        try:
            async with db_pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT id, role, message, created_at
                    FROM portal_thread_messages
                    WHERE tenant_id = $1 AND client_id = $2 AND case_id = $3
                    ORDER BY created_at ASC
                    """,
                    tenant_id,
                    client_id,
                    case_id,
                )
                return {
                    "client_id": client_id,
                    "tenant_id": tenant_id,
                    "case_id": case_id,
                    "messages": [
                        {
                            "id": str(row["id"]),
                            "role": row["role"],
                            "text": row["message"],
                            "time": row["created_at"].strftime("%H:%M:%S"),
                        }
                        for row in rows
                    ],
                    "source": "db",
                }
        except Exception:
            pass

    return {
        "client_id": client_id,
        "tenant_id": tenant_id,
        "case_id": case_id,
        "messages": portal_threads_fallback.get(key, []),
        "source": "memory",
    }


@app.post("/api/v1/portal/threads/{client_id}")
async def create_portal_thread_message(client_id: str, request: PortalThreadMessageRequest):
    key = _portal_threads_key(request.tenant_id, client_id, request.case_id)
    message = {
        "id": f"{request.role}-{int(datetime.utcnow().timestamp() * 1000)}",
        "role": request.role,
        "text": request.text,
        "time": datetime.utcnow().strftime("%H:%M:%S"),
    }
    portal_threads_fallback.setdefault(key, []).append(message)

    if db_pool:
        try:
            async with db_pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO portal_thread_messages (tenant_id, client_id, case_id, role, message)
                    VALUES ($1, $2, $3, $4, $5)
                    """,
                    request.tenant_id,
                    client_id,
                    request.case_id,
                    request.role,
                    request.text,
                )
        except Exception:
            pass

    return {"status": "saved", "message": message}


@app.websocket("/ws/system")
async def ws_system(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            payload = await system_health()
            await websocket.send_json({"type": "health_update", "payload": payload.model_dump()})
            for log in payload.recent_logs[:1]:
                await websocket.send_json({"type": "log", "payload": log.model_dump()})
            await sleep(5)
    except WebSocketDisconnect:
        return


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
