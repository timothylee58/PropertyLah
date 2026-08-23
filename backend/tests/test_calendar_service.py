from datetime import datetime, timedelta, timezone

import httpx
import pytest

from app.services import calendar_service, lead_service


class _FakeResponse:
    def __init__(self, payload: dict, text: str | None = None):
        self._payload = payload
        self.text = text or ""

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        if self._payload is _NON_JSON:
            raise ValueError("Expecting value: line 1 column 1 (char 0)")
        return self._payload


_NON_JSON = object()


class _FakeClient:
    """Minimal stand-in for httpx.AsyncClient that records the outgoing request."""

    def __init__(self, payload: dict, captured: dict):
        self._payload = payload
        self._captured = captured

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, url, params=None, headers=None):
        self._captured.update(url=url, params=params, headers=headers)
        return _FakeResponse(self._payload, text="<html>maintenance</html>")

    async def post(self, url, json=None, headers=None):
        self._captured.update(url=url, json=json, headers=headers)
        return _FakeResponse(self._payload)


def _patch_client(monkeypatch, payload: dict) -> dict:
    captured: dict = {}
    monkeypatch.setattr(
        calendar_service.httpx,
        "AsyncClient",
        lambda **kwargs: _FakeClient(payload, captured),
    )
    return captured


def _future(hours: int) -> str:
    return (
        (datetime.now(timezone.utc) + timedelta(hours=hours))
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


@pytest.mark.asyncio
async def test_slots_are_sorted_deduped_by_time_and_limited(monkeypatch):
    payload = {
        "data": {
            "day-two": [{"start": _future(48)}],
            # bare strings and objects both occur depending on the pinned API version
            "day-one": [_future(24), {"start": _future(26)}, {"start": _future(25)}],
            "past": [_future(-5)],
        }
    }
    captured = _patch_client(monkeypatch, payload)

    slots = await calendar_service.get_available_slots(limit=3)

    assert [s["start"] for s in slots] == sorted(s["start"] for s in slots)
    assert len(slots) == 3
    assert captured["headers"]["cal-api-version"] == "2024-09-04"
    assert captured["params"]["eventTypeId"] == 42


@pytest.mark.asyncio
async def test_malformed_slots_are_skipped(monkeypatch):
    _patch_client(monkeypatch, {"data": {"day": ["not-a-date", None, {"start": _future(3)}]}})
    assert len(await calendar_service.get_available_slots()) == 1


@pytest.mark.asyncio
async def test_slot_lookup_error_is_wrapped(monkeypatch):
    class _FailingClient(_FakeClient):
        async def get(self, url, params=None, headers=None):
            raise httpx.ConnectError("boom")

    monkeypatch.setattr(
        calendar_service.httpx, "AsyncClient", lambda **kwargs: _FailingClient({}, {})
    )
    with pytest.raises(calendar_service.CalendarError):
        await calendar_service.get_available_slots()


@pytest.mark.asyncio
async def test_booking_sends_utc_start_and_returns_local_label(monkeypatch):
    captured = _patch_client(monkeypatch, {"data": {"uid": "bk-9", "status": "accepted"}})

    booking = await calendar_service.book_slot(
        start="2026-09-01T02:00:00Z",
        attendee_name="Aisyah",
        attendee_phone="+60123456789",
        notes="Viewing for KLCC-102",
        metadata={"vapi_call_id": "call-1"},
    )

    assert captured["json"]["start"] == "2026-09-01T02:00:00Z"
    assert captured["json"]["eventTypeId"] == 42
    assert captured["json"]["attendee"]["phoneNumber"] == "+60123456789"
    assert captured["json"]["metadata"]["vapi_call_id"] == "call-1"
    assert booking["booking_uid"] == "bk-9"
    # 02:00 UTC is 10:00 in Kuala Lumpur
    assert booking["label"] == "Tue 1 Sep, 10:00 AM"


@pytest.mark.asyncio
async def test_booking_rejects_unparseable_start(monkeypatch):
    _patch_client(monkeypatch, {})
    with pytest.raises(calendar_service.CalendarError):
        await calendar_service.book_slot(start="tomorrow afternoon")


@pytest.mark.asyncio
async def test_missing_credentials_raise_not_configured(monkeypatch):
    monkeypatch.setattr(calendar_service.settings, "CAL_API_KEY", "")
    with pytest.raises(calendar_service.CalendarNotConfigured):
        await calendar_service.get_available_slots()


@pytest.mark.asyncio
async def test_non_json_body_is_an_upstream_error_not_a_crash(monkeypatch):
    """json.JSONDecodeError is a ValueError, not an httpx.HTTPError — it used to escape."""
    _patch_client(monkeypatch, _NON_JSON)
    with pytest.raises(calendar_service.CalendarError):
        await calendar_service.get_available_slots()
    with pytest.raises(calendar_service.CalendarError):
        await calendar_service.book_slot(start="2026-09-01T02:00:00Z")


@pytest.mark.asyncio
async def test_wrongly_typed_slot_payload_is_an_upstream_error(monkeypatch):
    _patch_client(monkeypatch, {"data": "unavailable"})
    with pytest.raises(calendar_service.CalendarError):
        await calendar_service.get_available_slots()


@pytest.mark.asyncio
async def test_wrongly_typed_booking_payload_still_returns_the_slot(monkeypatch):
    _patch_client(monkeypatch, {"data": "created"})
    booking = await calendar_service.book_slot(start="2026-09-01T02:00:00Z")
    assert booking["booking_uid"] is None


@pytest.mark.asyncio
async def test_non_numeric_event_type_is_a_config_error(monkeypatch):
    monkeypatch.setattr(calendar_service.settings, "CAL_EVENT_TYPE_ID", "my-event")
    _patch_client(monkeypatch, {"data": {}})
    with pytest.raises(calendar_service.CalendarNotConfigured):
        await calendar_service.book_slot(start="2026-09-01T02:00:00Z")


@pytest.mark.parametrize(
    "lead_type,score,expected",
    [
        ("buyer", 80, "qualified"),
        ("buyer", 20, "disqualified"),
        ("tenant", None, "new"),
        ("maintenance", 10, "new"),
    ],
)
def test_status_is_derived_from_score(lead_type, score, expected):
    assert lead_service._derive_status(lead_type, score) == expected
