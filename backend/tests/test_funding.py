"""
Tests for the /api/v1/funding-matches/:client_id endpoint.
"""
import pytest
from httpx import ASGITransport, AsyncClient

from main import app

CLIENT_ID = "11111111-1111-1111-1111-111111111111"
UNKNOWN_CLIENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


@pytest.mark.asyncio
async def test_funding_matches_returns_200():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get(f"/api/v1/funding-matches/{CLIENT_ID}")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_funding_matches_response_shape():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get(f"/api/v1/funding-matches/{CLIENT_ID}")
    data = response.json()
    assert "matches" in data
    assert isinstance(data["matches"], list)


@pytest.mark.asyncio
async def test_funding_matches_unknown_client_returns_200():
    """Unknown client should still return a valid (possibly empty) response."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get(f"/api/v1/funding-matches/{UNKNOWN_CLIENT_ID}")
    assert response.status_code == 200
    data = response.json()
    assert "matches" in data


@pytest.mark.asyncio
async def test_treatment_plan_returns_200():
    payload = {
        "client_id": CLIENT_ID,
        "tenant_id": "00000000-0000-0000-0000-000000000001",
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/generate-treatment-plan", json=payload)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_treatment_plan_response_shape():
    payload = {
        "client_id": CLIENT_ID,
        "tenant_id": "00000000-0000-0000-0000-000000000001",
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/generate-treatment-plan", json=payload)
    data = response.json()
    assert "treatment_plan" in data
    assert "items" in data["treatment_plan"]
    assert isinstance(data["treatment_plan"]["items"], list)
