"""
Tests for the /api/v1/health and /api/v1/system/health endpoints.
"""
import pytest
from httpx import ASGITransport, AsyncClient

from main import app


@pytest.mark.asyncio
async def test_health_returns_200():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_response_shape():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/health")
    data = response.json()
    assert "status" in data
    assert "timestamp" in data
    assert isinstance(data["db_connected"], bool)
    assert isinstance(data["redis_connected"], bool)


@pytest.mark.asyncio
async def test_system_health_returns_200():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/system/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_system_health_response_shape():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/system/health")
    data = response.json()
    assert "graphql" in data
    assert "database" in data
    assert "redis" in data
    assert "agents" in data
    assert "recent_logs" in data
