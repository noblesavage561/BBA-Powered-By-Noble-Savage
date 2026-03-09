import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, Optional

import asyncpg
import redis.asyncio as redis
from fastapi import BackgroundTasks, FastAPI
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
