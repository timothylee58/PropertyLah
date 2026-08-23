"""Lead and call-log persistence.

Every write is keyed on `vapi_call_id` so a retried Vapi delivery updates the
same row instead of creating a duplicate lead or call log, and so an end-of-call
report can find the lead the conversation created and link the two.
"""

from datetime import datetime, timezone

from app.core.database import get_db
from app.models.lead import LeadStatus, LeadType
from app.services import scoring

QUALIFIED_SCORE_THRESHOLD = 60

LEAD_FIELDS = {
    "caller_name",
    "caller_phone",
    "lead_type",
    "budget_range",
    "preferred_area",
    "timeline",
    "language",
    "qualification_score",
    "property_reference",
    "listing_verified",
    "notes",
}


def _derive_status(lead_type: str | None, score: int | None) -> str:
    if lead_type == LeadType.maintenance.value:
        return LeadStatus.new.value
    if score is None:
        return LeadStatus.new.value
    return (
        LeadStatus.qualified.value
        if score >= QUALIFIED_SCORE_THRESHOLD
        else LeadStatus.disqualified.value
    )


def upsert_lead_from_call(vapi_call_id: str, params: dict, caller_phone: str | None = None) -> dict:
    """Persist what the agent learned during `vapi_call_id`'s conversation.

    This is the `create_lead` tool's handler — named `upsert` because it also
    covers every later call for the same `vapi_call_id` (a mid-call save, a
    retried tool call, the final summary), not just the first one.
    """
    row = {key: value for key, value in params.items() if key in LEAD_FIELDS and value is not None}
    row["vapi_call_id"] = vapi_call_id
    if caller_phone and not row.get("caller_phone"):
        row["caller_phone"] = caller_phone
    row.setdefault("lead_type", LeadType.unknown.value)

    if row.get("qualification_score") is None:
        # the agent didn't supply one this call — score off everything known
        # about the lead so far, not just the fields this call happened to send
        existing = get_lead_by_call(vapi_call_id) or {}
        row["qualification_score"] = scoring.compute_lead_score({**existing, **row})

    row["status"] = _derive_status(row.get("lead_type"), row.get("qualification_score"))

    result = get_db().table("leads").upsert(row, on_conflict="vapi_call_id").execute()
    return (result.data or [{}])[0]


def ensure_lead(vapi_call_id: str, caller_phone: str | None = None) -> dict:
    """Get-or-create a minimal row for `vapi_call_id`.

    Called on the conversation's first turn, before the agent has learned
    anything, so mid-call turns have a `lead_id` to log messages against
    (see `add_message`). `create_lead`/`upsert_lead_from_call` fills the rest
    in later via the same upsert-on-`vapi_call_id`.
    """
    existing = get_lead_by_call(vapi_call_id)
    if existing:
        return existing
    row = {"vapi_call_id": vapi_call_id, "status": LeadStatus.new.value}
    if caller_phone:
        row["caller_phone"] = caller_phone
    result = get_db().table("leads").upsert(row, on_conflict="vapi_call_id").execute()
    return (result.data or [{}])[0]


def get_lead_by_call(vapi_call_id: str) -> dict | None:
    result = (
        get_db()
        .table("leads")
        .select("*")
        .eq("vapi_call_id", vapi_call_id)
        .limit(1)
        .execute()
    )
    return (result.data or [None])[0]


def record_booking(vapi_call_id: str, booking: dict, caller_phone: str | None = None) -> dict:
    """Attach a confirmed Cal.com booking to the call's lead, creating it if needed."""
    row = {
        "vapi_call_id": vapi_call_id,
        "status": LeadStatus.appointment_booked.value,
        "appointment_at": booking.get("start"),
        "booking_uid": booking.get("booking_uid"),
    }
    if caller_phone:
        row["caller_phone"] = caller_phone
    result = get_db().table("leads").upsert(row, on_conflict="vapi_call_id").execute()
    return (result.data or [{}])[0]


def get_lead(lead_id: str) -> dict | None:
    result = get_db().table("leads").select("*").eq("id", lead_id).limit(1).execute()
    return (result.data or [None])[0]


def _touch(lead_id: str, patch: dict) -> dict | None:
    patch = {**patch, "updated_at": datetime.now(timezone.utc).isoformat()}
    result = get_db().table("leads").update(patch).eq("id", lead_id).execute()
    return (result.data or [None])[0]


def set_conversation_status(lead_id: str, status: str) -> dict | None:
    return _touch(lead_id, {"conversation_status": status})


def assign_agent(lead_id: str, agent_name: str) -> dict | None:
    return _touch(lead_id, {"assigned_agent": agent_name})


def set_call_status(lead_id: str, status: str) -> dict | None:
    return _touch(lead_id, {"call_status": status})


def add_message(
    lead_id: str,
    sender: str,
    content: str,
    channel: str = "whatsapp",
    delivery_status: str = "sent",
    metadata: dict | None = None,
) -> dict:
    row = {
        "lead_id": lead_id,
        "sender": sender,
        "channel": channel,
        "content": content,
        "delivery_status": delivery_status,
    }
    if metadata:
        row["metadata"] = metadata
    result = get_db().table("messages").insert(row).execute()
    return (result.data or [{}])[0]


def list_messages(lead_id: str) -> list[dict]:
    result = (
        get_db()
        .table("messages")
        .select("*")
        .eq("lead_id", lead_id)
        .order("created_at")
        .execute()
    )
    return result.data or []


def save_call_log(message: dict) -> dict:
    """Upsert the end-of-call report and link it to the lead from the same call."""
    call = message.get("call") or {}
    vapi_call_id = call.get("id")
    if not vapi_call_id:
        raise ValueError("end-of-call report is missing call.id")

    lead = get_lead_by_call(vapi_call_id)
    row = {
        "vapi_call_id": vapi_call_id,
        "lead_id": (lead or {}).get("id"),
        "direction": call.get("type", "inbound"),
        "transcript": message.get("transcript"),
        "duration_seconds": message.get("durationSeconds"),
        "ended_reason": message.get("endedReason"),
        "consent_disclosed": True,
        "ended_at": message.get("endedAt") or datetime.now(timezone.utc).isoformat(),
    }
    if message.get("startedAt"):
        row["started_at"] = message["startedAt"]

    result = get_db().table("call_logs").upsert(row, on_conflict="vapi_call_id").execute()
    return (result.data or [{}])[0]
