"""End-to-end qualification conversation, run entirely in isolation.

No real network calls (Qwen, Cal.com, OpenClaw, Supabase) — every external
dependency is faked or monkeypatched, so this exercises the actual
tool-dispatch/state-machine/persistence wiring the way a real call would
drive it, turn by turn, without needing live credentials for CI.
"""

import json

import pytest
from fastapi.testclient import TestClient

from app.agents import state_machine
from app.api.routes import voice_webhook
from app.main import app
from app.services import calendar_service, lead_service, listings_service
from tests.fake_supabase import FakeDb

SECRET = "test-secret"
CALL_ID = "call-e2e-1"
CALLER_PHONE = "+60123456789"

client = TestClient(app, headers={"x-vapi-secret": SECRET})


@pytest.fixture
def db(monkeypatch):
    fake = FakeDb({"leads": [], "call_logs": [], "messages": [], "listings": [
        {
            "id": "verde-mont-kiara-3br", "name": "Verde Mont Kiara",
            "location": "Mont Kiara, Kuala Lumpur", "price": 1180000,
            "price_display": "RM1,180,000", "beds": 3, "baths": 2, "sqft": 1250,
            "property_type": "Condominium", "status": "available",
        },
    ]})
    monkeypatch.setattr(lead_service, "get_db", lambda: fake)
    monkeypatch.setattr(listings_service, "get_db", lambda: fake)
    return fake


def _function_call(name: str, params: dict, call_id: str = CALL_ID) -> dict:
    return {
        "message": {
            "type": "function-call",
            "call": {"id": call_id, "customer": {"number": CALLER_PHONE}},
            "functionCall": {"name": name, "parameters": params},
        }
    }


def _post(body: dict):
    return client.post("/webhook/vapi", content=json.dumps(body))


def test_full_qualification_and_booking_flow(db, monkeypatch):
    # 1. caller mentions a specific listing — verify it before saying anything about it
    async def fake_verify_listing(ref):
        return {"verified": True, "price": "RM1,180,000", "url": "https://example.com/mk"}

    monkeypatch.setattr(voice_webhook.openclaw_tools, "verify_listing", fake_verify_listing)
    result = _post(_function_call("verify_listing", {"property_reference": "Verde Mont Kiara"}))
    assert result.json()["result"]["verified"] is True

    # 2. caller wants to browse — list_listings hits the fake Supabase table
    result = _post(_function_call("list_listings", {"location": "Mont Kiara"}))
    listings = result.json()["result"]["listings"]
    assert [listing["id"] for listing in listings] == ["verde-mont-kiara-3br"]

    # 3. caller asks if the price is fair — comps, not a guess
    monkeypatch.setattr(
        voice_webhook.comps_service,
        "find_comps",
        lambda area, budget_range, property_type: {
            "comps": [{"transactions": 12, "median_price": 1150000}],
            "source": "NAPIC",
        },
    )
    result = _post(_function_call("get_comps", {"area": "Mont Kiara"}))
    assert result.json()["result"]["source"] == "NAPIC"

    # 4. slots, then a booking
    async def fake_slots():
        return [{"start": "2026-09-01T02:00:00Z", "label": "Tue 1 Sep, 10:00 AM"}]

    async def fake_book_slot(**kwargs):
        return {"start": kwargs["start"], "booking_uid": "cal-e2e-1"}

    monkeypatch.setattr(calendar_service, "get_available_slots", fake_slots)
    monkeypatch.setattr(calendar_service, "book_slot", fake_book_slot)

    result = _post(_function_call("get_available_slots", {}))
    assert result.json()["result"]["slots"][0]["label"] == "Tue 1 Sep, 10:00 AM"

    result = _post(_function_call("book_appointment", {
        "preferred_datetime": "2026-09-01T02:00:00Z",
        "lead_type": "buyer",
        "caller_name": "Aisha Rahman",
        "notes": "Verde Mont Kiara",
    }))
    assert result.json()["result"]["booked"] is True

    lead_after_booking = lead_service.get_lead_by_call(CALL_ID)
    assert lead_after_booking["appointment_at"] == "2026-09-01T02:00:00Z"
    assert lead_after_booking["booking_uid"] == "cal-e2e-1"
    # the state machine sees this lead as done, regardless of budget/area/timeline
    assert state_machine.next_state(lead_after_booking) == state_machine.ConversationState.viewing_booked

    # 5. wrap-up — create_lead, no qualification_score supplied this call
    result = _post(_function_call("create_lead", {
        "lead_type": "buyer",
        "budget_range": "RM1.1m-1.3m",
        "preferred_area": "Mont Kiara",
        "timeline": "within a month",
        "caller_name": "Aisha Rahman",
        "listing_verified": True,
        "notes": "Qualified, viewing booked for Verde Mont Kiara.",
    }))
    saved = result.json()["result"]
    assert saved["saved"] is True
    assert saved["status"] == "qualified"

    final_lead = lead_service.get_lead(saved["lead_id"])
    # scored off everything captured across the whole call, not just this tool call's params
    assert final_lead["qualification_score"] >= 90
    assert final_lead["caller_phone"] == CALLER_PHONE

    # 6. end-of-call report links back to the same lead
    result = _post({
        "message": {
            "type": "end-of-call-report",
            "call": {"id": CALL_ID},
            "transcript": "Agent: ... Caller: ...",
            "durationSeconds": 240,
        }
    })
    assert result.json() == {"received": True}
    call_log = db.tables["call_logs"][0]
    assert call_log["lead_id"] == final_lead["id"]
    assert call_log["transcript"].startswith("Agent:")


def test_turn_by_turn_logging_and_state_hint(db, monkeypatch):
    """The /llm/chat/completions path: ensures a lead exists, hints the model
    with the current qualification step, and logs both sides of the turn."""
    captured = {}

    def fake_get_completion(messages, state_hint=None):
        captured["messages"] = messages
        captured["state_hint"] = state_hint
        return {"choices": [{"message": {"role": "assistant", "content": "Are you buying or renting?"}}]}

    monkeypatch.setattr(voice_webhook, "get_completion", fake_get_completion)

    body = {
        "call": {"id": CALL_ID, "customer": {"number": CALLER_PHONE}},
        "messages": [{"role": "user", "content": "Hi, I'm interested in a property"}],
    }
    response = client.post("/llm/chat/completions", content=json.dumps(body))
    assert response.status_code == 200
    assert response.json()["choices"][0]["message"]["content"] == "Are you buying or renting?"

    # a brand-new call with nothing known yet should be nudged to identify intent
    assert "buyer" in captured["state_hint"].lower() or "intent" in captured["state_hint"].lower()

    lead = lead_service.get_lead_by_call(CALL_ID)
    assert lead is not None

    turns = lead_service.list_messages(lead["id"])
    assert [t["sender"] for t in turns] == ["lead", "ai"]
    assert turns[0]["content"] == "Hi, I'm interested in a property"
    assert turns[1]["content"] == "Are you buying or renting?"
    assert all(t["channel"] == "voice" for t in turns)


def test_a_logging_failure_does_not_break_the_completion(db, monkeypatch):
    monkeypatch.setattr(
        voice_webhook,
        "get_completion",
        lambda messages, state_hint=None: {"choices": [{"message": {"content": "ok"}}]},
    )

    def boom(*args, **kwargs):
        raise RuntimeError("messages table unavailable")

    monkeypatch.setattr(lead_service, "add_message", boom)

    body = {"call": {"id": "call-broken-log"}, "messages": [{"role": "user", "content": "hi"}]}
    response = client.post("/llm/chat/completions", content=json.dumps(body))

    assert response.status_code == 200
    assert response.json()["choices"][0]["message"]["content"] == "ok"


def test_unknown_function_call_is_reported_not_crashed(db):
    result = _post(_function_call("delete_all_leads", {}))
    assert "unknown function" in result.json()["result"]["error"]
