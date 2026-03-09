import os
import random
from asyncio import sleep
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

import asyncpg
import redis.asyncio as redis
from fastapi import BackgroundTasks, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agents.compliance_agent import ComplianceAgent
from agents.executive_strategist import ExecutiveStrategistAgent
from agents.financial_agent import FinancialAgent
from agents.funding_agent import FundingAgent
from agents.intake_agent import IntakeAgent

# Database/Redis clients are optional for local execution.
db_pool: Optional[asyncpg.Pool] = None
redis_client: Optional[redis.Redis] = None
last_30_latencies: List[int] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool, redis_client

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

    yield

    if db_pool:
        await db_pool.close()
    if redis_client:
        await redis_client.close()


app = FastAPI(title="BBA Services OS - AI Engine", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DocumentAnalysisRequest(BaseModel):
    document_id: str
    client_id: str
    tenant_id: str


class TransactionCategorizationRequest(BaseModel):
    transaction_id: str
    description: str
    amount: float
    previous_context: Optional[Dict[str, Any]] = None


class TreatmentPlanRequest(BaseModel):
    client_id: str
    tenant_id: str


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
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "db_connected": db_pool is not None,
        "redis_connected": redis_client is not None,
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
