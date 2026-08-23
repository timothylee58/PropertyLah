"""The dashboard adapter: Supabase rows in, frontend contract out."""

import pytest
from fastapi.testclient import TestClient

from app.api.routes import dashboard
from app.main import app
from app.services import dashboard_presenter

client = TestClient(app)

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
}


class FakeQuery:
    """Just enough of the supabase-py builder for these routes."""

    def __init__(self, rows: list[dict], calls: list[tuple]):
        self._rows = rows
        self._calls = calls

    def select(self, *args) -> "FakeQuery":
        return self

    def order(self, *args, **kwargs) -> "FakeQuery":
        return self

    def limit(self, *args) -> "FakeQuery":
        return self

    def eq(self, column: str, value: str) -> "FakeQuery":
        self._calls.append((column, value))
        return self._filtered(
            [row for row in self._rows if str(row.get(column)) == str(value)]
        )

    def _filtered(self, rows: list[dict]) -> "FakeQuery":
        return FakeQuery(rows, self._calls)

    def execute(self) -> "FakeQuery":
        return self

    @property
    def data(self) -> list[dict]:
        return self._rows


class FakeDb:
    def __init__(self, tables: dict[str, list[dict]]):
        self.tables = tables
        self.calls: list[tuple] = []

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self.tables.get(name, []), self.calls)


@pytest.fixture
def db(monkeypatch):
    fake = FakeDb({"leads": [dict(LEAD_ROW)], "call_logs": []})
    monkeypatch.setattr(dashboard, "get_db", lambda: fake)
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
