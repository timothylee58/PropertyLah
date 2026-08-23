"""Cal.com v2 booking backend for property viewings.

Two operations matter to the voice agent: which slots are free, and booking one
of them. Slot strings handed to the agent are always UTC ISO-8601 so a slot can
be echoed straight back into `book_appointment` without timezone guesswork,
while `label` carries the human phrasing the agent reads out loud.
"""

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import httpx

from app.config import settings


class CalendarError(Exception):
    """Raised when Cal.com is unreachable, misconfigured, or rejects a request."""


class CalendarNotConfigured(CalendarError):
    pass


def _require_config() -> int:
    if not settings.CAL_API_KEY or not settings.CAL_EVENT_TYPE_ID:
        raise CalendarNotConfigured("CAL_API_KEY and CAL_EVENT_TYPE_ID must be set")
    try:
        return int(settings.CAL_EVENT_TYPE_ID)
    except (TypeError, ValueError) as e:
        raise CalendarNotConfigured(
            f"CAL_EVENT_TYPE_ID must be numeric, got {settings.CAL_EVENT_TYPE_ID!r}"
        ) from e


def _headers(api_version: str) -> dict:
    return {
        "Authorization": f"Bearer {settings.CAL_API_KEY}",
        "cal-api-version": api_version,
        "Content-Type": "application/json",
    }


def _tz() -> ZoneInfo:
    return ZoneInfo(settings.CAL_TIMEZONE)


def _decode(resp: httpx.Response) -> dict:
    """Cal.com is expected to answer JSON objects; anything else is an upstream fault."""
    try:
        payload = resp.json()
    except ValueError as e:
        raise CalendarError(f"cal.com returned a non-JSON body: {resp.text[:200]!r}") from e
    if not isinstance(payload, dict):
        raise CalendarError(f"cal.com returned a {type(payload).__name__}, expected an object")
    return payload


def _parse_slot_start(raw: object) -> datetime | None:
    """Slot entries come back either as ISO strings or as {"start": iso, ...}."""
    value = raw.get("start") if isinstance(raw, dict) else raw
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def format_slot(start: datetime) -> dict:
    local = start.astimezone(_tz())
    return {
        "start": start.isoformat().replace("+00:00", "Z"),
        "label": local.strftime("%a %d %b, %I:%M %p").replace(" 0", " "),
        "timezone": settings.CAL_TIMEZONE,
    }


async def get_available_slots(days_ahead: int | None = None, limit: int | None = None) -> list[dict]:
    """Return the next available viewing slots, soonest first."""
    event_type_id = _require_config()
    days_ahead = days_ahead or settings.CAL_SLOT_DAYS_AHEAD
    limit = limit or settings.CAL_SLOTS_TO_OFFER

    now = datetime.now(timezone.utc)
    params = {
        "eventTypeId": event_type_id,
        "start": now.date().isoformat(),
        "end": (now + timedelta(days=days_ahead)).date().isoformat(),
        "timeZone": settings.CAL_TIMEZONE,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(
                f"{settings.CAL_BASE_URL}/slots",
                params=params,
                headers=_headers(settings.CAL_SLOTS_API_VERSION),
            )
            resp.raise_for_status()
            payload = _decode(resp)
        except httpx.HTTPError as e:
            raise CalendarError(f"cal.com slots lookup failed: {e}") from e

    # {"data": {"2026-08-25": [{"start": "..."}, ...], ...}}
    by_day = payload.get("data")
    if not isinstance(by_day, dict):
        raise CalendarError(f"unexpected cal.com slots payload: {type(by_day).__name__}")
    starts = [
        start
        for day_slots in by_day.values()
        for start in (_parse_slot_start(slot) for slot in day_slots or [])
        if start is not None and start > now
    ]
    return [format_slot(start) for start in sorted(starts)[:limit]]


async def book_slot(
    start: str,
    attendee_name: str | None = None,
    attendee_phone: str | None = None,
    attendee_email: str | None = None,
    notes: str | None = None,
    metadata: dict | None = None,
) -> dict:
    """Book `start` (ISO-8601, UTC) and return the confirmed booking."""
    event_type_id = _require_config()

    parsed = _parse_slot_start(start)
    if parsed is None:
        raise CalendarError(f"unparseable slot start: {start!r}")

    email = attendee_email or settings.CAL_FALLBACK_ATTENDEE_EMAIL
    if not email:
        raise CalendarNotConfigured(
            "an attendee email is required — pass one or set CAL_FALLBACK_ATTENDEE_EMAIL"
        )

    attendee: dict = {
        "name": attendee_name or "Phone caller",
        "email": email,
        "timeZone": settings.CAL_TIMEZONE,
    }
    if attendee_phone:
        attendee["phoneNumber"] = attendee_phone

    body: dict = {
        "start": parsed.isoformat().replace("+00:00", "Z"),
        "eventTypeId": event_type_id,
        "attendee": attendee,
    }
    if notes:
        body["metadata"] = {**(metadata or {}), "notes": notes[:480]}
    elif metadata:
        body["metadata"] = metadata

    async with httpx.AsyncClient(timeout=20) as client:
        try:
            resp = await client.post(
                f"{settings.CAL_BASE_URL}/bookings",
                json=body,
                headers=_headers(settings.CAL_BOOKINGS_API_VERSION),
            )
            resp.raise_for_status()
            payload = _decode(resp)
        except httpx.HTTPStatusError as e:
            raise CalendarError(
                f"cal.com booking rejected ({e.response.status_code}): {e.response.text[:200]}"
            ) from e
        except httpx.HTTPError as e:
            raise CalendarError(f"cal.com booking failed: {e}") from e

    booking = payload.get("data")
    if not isinstance(booking, dict):
        booking = {}
    return {
        **format_slot(parsed),
        "booking_uid": booking.get("uid"),
        "status": booking.get("status", "accepted"),
        "meeting_url": booking.get("meetingUrl"),
    }
