"""The dashboard adapter: Supabase rows in, frontend contract out."""

import pytest
from fastapi.testclient import TestClient

from app.api.routes import dashboard, leads
from app.main import app
from app.services import dashboard_presenter, lead_service
from tests.fake_supabase import FakeDb

API_KEY = "test-dashboard-key"

client = TestClient(app, headers={"X-Api-Key": API_KEY})
anon_client = TestClient(app)

LEAD_ROW = {
    "id": "lead-1",
    "caller_name": "Aisyah Rahman",
    "caller_phone": "+60123456789",
    "lead_type": "tenant",
    "budget_range": "RM2.5k-3.5k",
    "preferred_area": "Mont Kiara",
    "timeline": "within a month",
    "qualification_score": 85,
    "status": "appointment_booked",
    "property_reference": "MK-2201",
    "notes": "Wants a 3-bedroom, viewing booked.",
    "appointment_at": "2026-09-01T02:00:00+00:00",
    "booking_uid": "cal-abc",
    "created_at": "2026-08-20T01:00:00+00:00",
    "updated_at": "2026-08-20T01:09:00+00:00",
    "conversation_status": "closed",
    "call_status": "completed",
}


@pytest.fixture
def db(monkeypatch):
    fake = FakeDb({"leads": [dict(LEAD_ROW)], "call_logs": [], "messages": []})
    # dashboard.py, leads.py and lead_service.py each hold their own
    # `get_db` reference (bound at import time) — all three need patching so
    # a write in one lands where a read in another expects to find it.
    monkeypatch.setattr(dashboard, "get_db", lambda: fake)
    monkeypatch.setattr(leads, "get_db", lambda: fake)
    monkeypatch.setattr(lead_service, "get_db", lambda: fake)
    return fake


def test_lead_list_is_mapped_to_the_dashboard_contract(db):
    lead = client.get("/api/leads").json()[0]

    assert lead["id"] == "lead-1"
    assert lead["name"] == "Aisyah Rahman"
    assert lead["intent"] == "renter"
    assert lead["status"] == "booked"
    assert lead["score"] == 85
    assert lead["scoreLabel"] == "Hot"
    assert lead["channel"] == "phone"
    # the UI reads into both unguarded
    assert lead["conversation"] == []
    assert lead["qualification"]["location"] == "Mont Kiara"


def test_the_full_phone_number_never_reaches_the_dashboard(db):
    lead = client.get("/api/leads").json()[0]

    assert "123456789" not in lead["phoneMasked"]
    assert lead["phoneMasked"].endswith("6789")


def test_lead_detail_surfaces_the_call_transcript_as_one_message(db):
    db.tables["call_logs"] = [{
        "lead_id": "lead-1",
        "transcript": "Agent: Hello...",
        "ended_at": "2026-08-20T01:09:00+00:00",
    }]

    lead = client.get("/api/leads/lead-1").json()

    assert [message["content"] for message in lead["conversation"]] == ["Agent: Hello..."]
    assert lead["conversation"][0]["channel"] == "phone"


def test_lead_detail_survives_a_transcript_lookup_failure(db, monkeypatch):
    def boom(lead_id: str) -> str:
        raise RuntimeError("call_logs unavailable")

    monkeypatch.setattr(dashboard, "_fetch_transcript", boom)

    response = client.get("/api/leads/lead-1")

    assert response.status_code == 200
    assert response.json()["conversation"] == []


def test_unknown_lead_is_404_not_null(db):
    assert client.get("/api/leads/nope").status_code == 404


def test_viewings_expose_the_reference_instead_of_an_invented_listing(db):
    viewing = client.get("/api/viewings").json()[0]

    assert viewing["bookingId"] == "cal-abc"
    assert viewing["propertyReference"] == "MK-2201"
    assert "listing" not in viewing
    assert viewing["slot"]["appointmentAt"] == "2026-09-01T02:00:00+00:00"


def test_leads_without_an_appointment_are_not_viewings(db):
    db.tables["leads"] = [{**LEAD_ROW, "appointment_at": None}]

    assert client.get("/api/viewings").json() == []
    assert client.get("/api/leads").json()[0]["bookedViewing"] is None


def test_overview_counters_come_from_the_leads_we_have(db):
    db.tables["leads"] = [
        dict(LEAD_ROW),
        {**LEAD_ROW, "id": "lead-2", "status": "qualified", "qualification_score": 70,
         "appointment_at": None},
        {**LEAD_ROW, "id": "lead-3", "status": "new", "qualification_score": None,
         "appointment_at": None},
    ]

    overview = client.get("/api/overview").json()

    assert (overview["newLeads"], overview["qualifiedLeads"]) == (1, 1)
    assert overview["bookedViewings"] == 1
    assert overview["hotLeads"] == 1
    assert len(overview["leads"]) == 3
    # no invented metric where none is recorded
    assert overview["medianFirstResponse"] == "—"


def test_activity_feed_is_newest_first(db):
    db.tables["leads"] = [
        {**LEAD_ROW, "id": "old", "appointment_at": None,
         "updated_at": "2026-08-01T00:00:00+00:00"},
        {**LEAD_ROW, "id": "new", "appointment_at": None,
         "updated_at": "2026-08-19T00:00:00+00:00"},
    ]

    activities = client.get("/api/overview").json()["activities"]

    assert [activity["leadId"] for activity in activities] == ["new", "old"]


@pytest.mark.parametrize(
    "stored,expected",
    [
        ("new", "new"),
        ("qualified", "qualified"),
        ("appointment_booked", "booked"),
        ("disqualified", "nurture"),
        ("scam_flagged", "nurture"),
        ("", "new"),
    ],
)
def test_agent_statuses_map_onto_the_dashboard_pipeline(stored, expected):
    assert dashboard_presenter.present_lead({"status": stored})["status"] == expected


@pytest.mark.parametrize(
    "budget_range,expected",
    [
        ("RM2.5k-3.5k", 3500),
        ("500k to 700k", 700_000),
        ("RM1.2m", 1_200_000),
        ("1,500,000", 1_500_000),
        ("negotiable", None),
        (None, None),
    ],
)
def test_free_text_budgets_yield_a_ceiling_or_nothing(budget_range, expected):
    assert dashboard_presenter.parse_budget_max(budget_range) == expected


def test_a_row_with_nothing_but_an_id_still_renders():
    """Early-call rows are sparse; the dashboard must not receive nulls it dereferences."""
    lead = dashboard_presenter.present_lead({"id": "bare"})

    assert lead["name"] == "Unknown caller"
    assert lead["phoneMasked"] == "Unknown number"
    assert lead["scoreLabel"] == "Nurture"
    assert lead["conversation"] == []
    assert lead["preferredAreas"] == []
    assert lead["qualification"]["viewingSelected"] is False


def test_a_malformed_appointment_does_not_break_the_label():
    assert dashboard_presenter.slot_label("not-a-date") == "Time to be confirmed"
    assert dashboard_presenter.slot_label(None) == "Time to be confirmed"


def test_appointment_labels_render_in_the_agency_timezone():
    # 02:00 UTC is 10:00 in Kuala Lumpur
    assert "10:00 AM" in dashboard_presenter.slot_label("2026-09-01T02:00:00Z")


# -- auth ---------------------------------------------------------------


@pytest.mark.parametrize("path", ["/api/leads", "/api/overview", "/api/viewings", "/leads", "/calls/x"])
def test_dashboard_and_raw_routes_reject_requests_without_a_key(db, path):
    assert anon_client.get(path).status_code == 401


def test_a_wrong_key_is_also_rejected(db):
    response = TestClient(app, headers={"X-Api-Key": "wrong"}).get("/api/leads")
    assert response.status_code == 401


def test_bearer_token_is_accepted_as_an_alternative_to_the_header(db):
    response = TestClient(app, headers={"Authorization": f"Bearer {API_KEY}"}).get("/api/leads")
    assert response.status_code == 200


# -- pagination -----------------------------------------------------------


def test_lead_list_is_paginated_with_a_total_count_header(db):
    db.tables["leads"] = [{**LEAD_ROW, "id": f"lead-{i}"} for i in range(5)]

    response = client.get("/api/leads?limit=2&offset=1")

    assert response.headers["X-Total-Count"] == "5"
    assert len(response.json()) == 2


# -- write actions ----------------------------------------------------------


def test_takeover_marks_the_conversation_human_handled_and_logs_it(db):
    lead = client.post("/api/leads/lead-1/takeover").json()

    assert lead["conversationStatus"] == "human_handling"
    assert any("human agent has joined" in m["content"] for m in lead["conversation"])


def test_assign_sets_the_agent_name(db):
    lead = client.post("/api/leads/lead-1/assign", json={"agentName": "Farah"}).json()

    assert lead["assignedAgent"] == "Farah"


def test_request_call_sets_call_status_to_requested(db):
    lead = client.post("/api/leads/lead-1/calls").json()

    assert lead["callStatus"] == "requested"


def test_unknown_lead_write_actions_are_404(db):
    assert client.post("/api/leads/nope/takeover").status_code == 404
    assert client.post("/api/leads/nope/assign", json={"agentName": "Farah"}).status_code == 404
    assert client.post("/api/leads/nope/calls").status_code == 404


def test_message_persists_and_gets_an_ai_reply(db, monkeypatch):
    monkeypatch.setattr(dashboard, "get_whatsapp_reply", lambda conversation, message: "Sure, tell me your budget.")

    response = client.post("/api/leads/lead-1/messages", json={"content": "Hi, still available?"})
    body = response.json()

    assert response.status_code == 200
    assert body["message"]["content"] == "Sure, tell me your budget."
    assert body["message"]["sender"] == "ai"
    contents = [m["content"] for m in body["lead"]["conversation"]]
    assert contents == ["Hi, still available?", "Sure, tell me your budget."]
    assert body["lead"]["conversationStatus"] == "ai_handling"


def test_message_does_not_get_an_ai_reply_once_a_human_has_taken_over(db, monkeypatch):
    monkeypatch.setattr(
        dashboard,
        "get_whatsapp_reply",
        lambda *a, **k: pytest.fail("must not call the AI once a human owns the thread"),
    )
    client.post("/api/leads/lead-1/takeover")

    response = client.post("/api/leads/lead-1/messages", json={"content": "Still there?"})
    body = response.json()

    assert body["message"] is None
    contents = [m["content"] for m in body["lead"]["conversation"]]
    assert "Still there?" in contents


def test_message_falls_back_to_a_generic_reply_if_the_completion_call_fails(db, monkeypatch):
    def boom(conversation, message):
        raise RuntimeError("upstream down")

    monkeypatch.setattr(dashboard, "get_whatsapp_reply", boom)

    response = client.post("/api/leads/lead-1/messages", json={"content": "Hello?"})

    assert response.status_code == 200
    assert response.json()["message"]["content"]


def test_book_viewing_confirms_and_updates_the_lead(db, monkeypatch):
    async def fake_book_slot(**kwargs):
        return {"start": kwargs["start"], "booking_uid": "cal-new"}

    monkeypatch.setattr(dashboard.calendar_service, "book_slot", fake_book_slot)
    db.tables["leads"] = [{**LEAD_ROW, "appointment_at": None, "status": "qualified"}]

    response = client.post(
        "/api/viewings", json={"leadId": "lead-1", "slotId": "2026-09-05T03:00:00+00:00"}
    )
    viewing = response.json()

    assert response.status_code == 200
    assert viewing["bookingId"] == "cal-new"
    assert viewing["appointmentAt"] == "2026-09-05T03:00:00+00:00"
    assert client.get("/api/leads/lead-1").json()["status"] == "booked"


def test_book_viewing_surfaces_a_calendar_error(db, monkeypatch):
    from app.services import calendar_service

    async def fake_book_slot(**kwargs):
        raise calendar_service.CalendarError("slot no longer available")

    monkeypatch.setattr(dashboard.calendar_service, "book_slot", fake_book_slot)

    response = client.post(
        "/api/viewings", json={"leadId": "lead-1", "slotId": "2026-09-05T03:00:00+00:00"}
    )

    assert response.status_code == 502


def test_listings_are_exposed_for_frontend_consumers(db, monkeypatch):
    db.tables["listings"] = [{
        "id": "verde-mont-kiara-3br", "name": "Verde Mont Kiara",
        "location": "Mont Kiara, Kuala Lumpur", "price": 1180000,
        "price_display": "RM1,180,000", "beds": 3, "baths": 2, "sqft": 1250,
        "property_type": "Condominium", "status": "available",
    }]
    monkeypatch.setattr(dashboard.listings_service, "get_db", lambda: db)

    listings = client.get("/api/listings").json()

    assert [listing["id"] for listing in listings] == ["verde-mont-kiara-3br"]


def test_listings_route_requires_auth(db):
    assert anon_client.get("/api/listings").status_code == 401
