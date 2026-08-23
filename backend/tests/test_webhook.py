import hashlib
import hmac
import json

import pytest
from fastapi.testclient import TestClient

from app.api.routes import calendar as calendar_routes
from app.api.routes import voice_webhook
from app.main import app
from app.services import calendar_service

SECRET = "test-secret"
client = TestClient(app)


def _post(body: dict, headers: dict | None = None):
    return client.post("/webhook/vapi", content=json.dumps(body), headers=headers or {})


def _signature(body: dict) -> str:
    return hmac.new(SECRET.encode(), json.dumps(body).encode(), hashlib.sha256).hexdigest()


def test_rejects_request_without_credentials():
    assert _post({"message": {"type": "status-update"}}).status_code == 401


def test_rejects_wrong_secret():
    response = _post({"message": {"type": "status-update"}}, {"x-vapi-secret": "nope"})
    assert response.status_code == 401


def test_accepts_shared_secret_header():
    response = _post({"message": {"type": "status-update"}}, {"x-vapi-secret": SECRET})
    assert response.status_code == 200


def test_accepts_body_signature():
    body = {"message": {"type": "status-update"}}
    response = _post(body, {"x-vapi-signature": _signature(body)})
    assert response.status_code == 200


def test_rejects_signature_of_different_body():
    response = _post(
        {"message": {"type": "status-update", "tampered": True}},
        {"x-vapi-signature": _signature({"message": {"type": "status-update"}})},
    )
    assert response.status_code == 401


@pytest.mark.parametrize("header", ["x-vapi-secret", "x-vapi-signature"])
def test_rejects_non_ascii_credentials(header):
    """compare_digest raises TypeError on non-ASCII str, which used to surface as a 500."""
    # Starlette decodes header bytes as latin-1, so this arrives as a non-ASCII str
    response = _post({"message": {"type": "status-update"}}, {header: "sécret".encode("latin-1")})
    assert response.status_code == 401


def test_rejects_non_json_body():
    response = client.post(
        "/webhook/vapi", content=b"not json", headers={"x-vapi-secret": SECRET}
    )
    assert response.status_code == 400


def test_rejects_non_object_body():
    response = client.post("/webhook/vapi", content=b"[1, 2]", headers={"x-vapi-secret": SECRET})
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_tool_failure_never_escapes_as_an_error(monkeypatch):
    async def explode(*args, **kwargs):
        raise RuntimeError("openclaw unreachable")

    monkeypatch.setattr(voice_webhook.openclaw_tools, "verify_listing", explode)
    result = await voice_webhook.dispatch_tool("verify_listing", {"property_reference": "x"}, {})
    assert "callback" in result["instruction"]


@pytest.mark.asyncio
async def test_comps_are_served_from_the_napic_index():
    result = await voice_webhook.dispatch_tool(
        "get_comps", {"area": "TTDI", "budget_range": "RM2m"}, {}
    )
    assert result["comps"][0]["transactions"] > 0
    assert result["source"].startswith("NAPIC")


def test_end_of_call_report_is_persisted(monkeypatch):
    saved = {}
    monkeypatch.setattr(
        voice_webhook.lead_service, "save_call_log", lambda message: saved.update(message) or {}
    )
    body = {
        "message": {
            "type": "end-of-call-report",
            "call": {"id": "call-1"},
            "transcript": "hello",
        }
    }
    response = _post(body, {"x-vapi-secret": SECRET})
    assert response.json() == {"received": True}
    assert saved["call"]["id"] == "call-1"


def test_end_of_call_report_survives_db_failure(monkeypatch):
    def explode(message):
        raise RuntimeError("supabase down")

    monkeypatch.setattr(voice_webhook.lead_service, "save_call_log", explode)
    body = {"message": {"type": "end-of-call-report", "call": {"id": "call-1"}}}
    assert _post(body, {"x-vapi-secret": SECRET}).status_code == 200


@pytest.mark.asyncio
async def test_book_appointment_falls_back_when_calendar_fails(monkeypatch):
    async def explode(**kwargs):
        raise calendar_service.CalendarError("cal.com down")

    monkeypatch.setattr(calendar_service, "book_slot", explode)
    result = await voice_webhook.book_appointment(
        {"preferred_datetime": "2026-09-01T02:00:00Z"}, None, "+60123456789"
    )
    assert result["booked"] is False
    assert "callback" in result["instruction"]


@pytest.mark.asyncio
async def test_book_appointment_is_idempotent_per_call(monkeypatch):
    monkeypatch.setattr(
        voice_webhook.lead_service,
        "get_lead_by_call",
        lambda call_id: {"booking_uid": "bk-1", "appointment_at": "2026-09-01T02:00:00Z"},
    )

    async def should_not_run(**kwargs):
        raise AssertionError("a second booking was attempted")

    monkeypatch.setattr(calendar_service, "book_slot", should_not_run)
    result = await voice_webhook.book_appointment(
        {"preferred_datetime": "2026-09-01T02:00:00Z"}, "call-1", None
    )
    assert result == {
        "booked": True,
        "booking_uid": "bk-1",
        "start": "2026-09-01T02:00:00Z",
        "already_booked": True,
    }


@pytest.mark.asyncio
async def test_tool_calls_batch_returns_one_result_per_call(monkeypatch):
    async def fake_slots():
        return [{"start": "2026-09-01T02:00:00Z", "label": "Tue 1 Sep, 10:00 AM"}]

    monkeypatch.setattr(calendar_service, "get_available_slots", fake_slots)
    results = await voice_webhook.handle_tool_calls(
        {
            "type": "tool-calls",
            "call": {"id": "call-1"},
            "toolCallList": [{"id": "tc-1", "function": {"name": "get_available_slots"}}],
        }
    )
    assert [r["toolCallId"] for r in results] == ["tc-1"]
    assert json.loads(results[0]["result"])["slots"][0]["label"] == "Tue 1 Sep, 10:00 AM"


def test_book_route_reports_success_when_the_slot_is_held_but_unlinkable(monkeypatch):
    """The slot is already taken at cal.com, so a DB failure must not read as a failed booking."""

    async def fake_book(**kwargs):
        return {"start": "2026-09-01T02:00:00Z", "booking_uid": "bk-1"}

    def explode(*args, **kwargs):
        raise RuntimeError("supabase_url is required")

    monkeypatch.setattr(calendar_service, "book_slot", fake_book)
    monkeypatch.setattr(calendar_routes.lead_service, "record_booking", explode)

    response = client.post(
        "/calendar/book",
        json={"preferred_datetime": "2026-09-01T02:00:00Z", "vapi_call_id": "call-1"},
    )
    assert response.status_code == 200
    assert response.json() == {
        "booked": True,
        "start": "2026-09-01T02:00:00Z",
        "booking_uid": "bk-1",
        "lead_linked": False,
    }


def test_json_string_arguments_are_parsed():
    assert voice_webhook._parse_arguments('{"a": 1}') == {"a": 1}
    assert voice_webhook._parse_arguments("not json") == {}
    assert voice_webhook._parse_arguments(None) == {}
