import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.core import rate_limit


@pytest.fixture(autouse=True)
def _reset():
    rate_limit.reset()
    yield
    rate_limit.reset()


@pytest.fixture(autouse=True)
def _enabled(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)


def _client_with_limit(limit_per_minute: int) -> TestClient:
    app = FastAPI()

    @app.get("/ping", dependencies=[Depends(rate_limit.enforce("test-bucket", limit_per_minute))])
    async def ping():
        return {"ok": True}

    return TestClient(app)


def test_requests_under_the_limit_all_succeed():
    client = _client_with_limit(3)
    for _ in range(3):
        assert client.get("/ping").status_code == 200


def test_a_request_past_the_limit_is_rejected_with_429():
    client = _client_with_limit(2)
    assert client.get("/ping").status_code == 200
    assert client.get("/ping").status_code == 200
    assert client.get("/ping").status_code == 429


def test_disabled_rate_limiting_never_rejects(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", False)
    client = _client_with_limit(1)
    for _ in range(5):
        assert client.get("/ping").status_code == 200


def test_separate_buckets_do_not_share_a_counter():
    rate_limit._check("bucket-a", "1.2.3.4", 1)
    with pytest.raises(Exception):
        rate_limit._check("bucket-a", "1.2.3.4", 1)
    # a different bucket for the same client still has headroom
    rate_limit._check("bucket-b", "1.2.3.4", 1)
