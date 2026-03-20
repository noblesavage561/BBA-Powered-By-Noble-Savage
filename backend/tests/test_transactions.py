"""
Tests for the /api/v1/categorize-transaction endpoint.
"""
import pytest
from httpx import ASGITransport, AsyncClient

from main import app

VALID_PAYLOAD = {
    "transaction_id": "tx-test-001",
    "description": "Monthly office rent",
    "amount": 2500.00,
}


@pytest.mark.asyncio
async def test_categorize_transaction_returns_200():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/categorize-transaction", json=VALID_PAYLOAD
        )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_categorize_transaction_response_shape():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/categorize-transaction", json=VALID_PAYLOAD
        )
    data = response.json()
    assert "category" in data
    assert "confidence" in data


@pytest.mark.asyncio
async def test_categorize_transaction_requires_description():
    payload = {"transaction_id": "tx-bad", "amount": 100.00}
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/categorize-transaction", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_categorize_transaction_with_context():
    payload = {**VALID_PAYLOAD, "previous_context": {"industry": "consulting"}}
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/categorize-transaction", json=payload)
    assert response.status_code == 200
