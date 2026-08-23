"""The `/api/*` surface the staff dashboard calls when demo mode is off.

Kept separate from the raw `/leads` routes, which return Supabase rows as-is for
debugging and other back-office consumers.

Every route here is an internal ops surface — it carries lead names, phone
numbers, and conversation content — so the whole router sits behind
`require_dashboard_auth` and a per-IP rate limit (see app/core/security.py and
app/core/rate_limit.py).
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel

from app.agents.qualification import get_whatsapp_reply
from app.config import settings
from app.core.database import get_db
from app.core.rate_limit import enforce
from app.core.security import require_dashboard_auth
from app.services import calendar_service, dashboard_presenter, lead_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api",
    dependencies=[
        Depends(require_dashboard_auth),
        Depends(enforce("dashboard", settings.RATE_LIMIT_DASHBOARD_PER_MINUTE)),
    ],
)

LEAD_LIST_LIMIT = 200
# /api/overview and /api/viewings aggregate over "all" leads rather than one
# page; this caps that scan so it stays cheap. Leads beyond this age out of
# the overview counters and calendar first — raise it, or move the aggregates
# to SQL-side counts, if that becomes visible in practice.
AGGREGATE_LEAD_CAP = 1000


def _fetch_leads(limit: int, offset: int = 0) -> tuple[list[dict], int]:
    result = (
        get_db()
        .table("leads")
        .select("*", count="exact")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data or [], result.count or 0


def _fetch_transcript(lead_id: str) -> str | None:
    result = (
        get_db()
        .table("call_logs")
        .select("transcript")
        .eq("lead_id", lead_id)
        .order("ended_at", desc=True)
        .limit(1)
        .execute()
    )
    return ((result.data or [{}])[0] or {}).get("transcript")


def _fetch_lead_row(lead_id: str) -> dict:
    result = get_db().table("leads").select("*").eq("id", lead_id).limit(1).execute()
    row = (result.data or [None])[0]
    if not row:
        raise HTTPException(status_code=404, detail="lead not found")
    return row


def _present_full_lead(row: dict) -> dict:
    lead_id = str(row.get("id"))
    try:
        transcript = _fetch_transcript(lead_id)
    except Exception:
        logger.exception("could not load the transcript for lead %s", lead_id)
        transcript = None
    try:
        messages = lead_service.list_messages(lead_id)
    except Exception:
        logger.exception("could not load messages for lead %s", lead_id)
        messages = []
    return dashboard_presenter.present_lead(row, transcript, messages)


@router.get("/leads")
async def list_leads(
    response: Response,
    limit: int = Query(default=LEAD_LIST_LIMIT, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[dict]:
    rows, total = _fetch_leads(limit, offset)
    # header, not a body-shape change, so this stays a drop-in for existing
    # callers that treat the response as a plain Lead[]
    response.headers["X-Total-Count"] = str(total)
    return [dashboard_presenter.present_lead(row) for row in rows]


@router.get("/leads/{lead_id}")
async def get_lead(lead_id: str) -> dict:
    row = _fetch_lead_row(lead_id)
    return _present_full_lead(row)


@router.get("/viewings")
async def list_viewings() -> list[dict]:
    rows, _ = _fetch_leads(AGGREGATE_LEAD_CAP)
    viewings = (dashboard_presenter.present_viewing(row) for row in rows)
    return [viewing for viewing in viewings if viewing]


@router.get("/overview")
async def get_overview() -> dict:
    rows, _ = _fetch_leads(AGGREGATE_LEAD_CAP)
    leads = [dashboard_presenter.present_lead(row) for row in rows]
    return dashboard_presenter.present_overview(leads)


class MessageRequest(BaseModel):
    content: str
    channel: str = "whatsapp"


class AssignRequest(BaseModel):
    agentName: str


class ViewingBookRequest(BaseModel):
    leadId: str
    slotId: str  # the slot's `start` value, as returned by GET /calendar/slots
    notes: str | None = None


def _to_chat_turns(messages: list[dict]) -> list[dict]:
    role_by_sender = {"lead": "user", "ai": "assistant", "human": "assistant", "system": "system"}
    return [
        {"role": role_by_sender.get(m.get("sender"), "user"), "content": m.get("content") or ""}
        for m in messages
    ]


@router.post("/leads/{lead_id}/messages")
async def post_message(lead_id: str, body: MessageRequest) -> dict:
    """Simulated/real inbound WhatsApp message -> persisted, AI replies unless a human has taken over."""
    row = _fetch_lead_row(lead_id)
    prior = lead_service.list_messages(lead_id)

    lead_service.add_message(lead_id, sender="lead", content=body.content, channel=body.channel)

    if (row.get("conversation_status") or "closed") != "human_handling":
        lead_service.set_conversation_status(lead_id, "ai_handling")
        try:
            reply = get_whatsapp_reply(_to_chat_turns(prior), body.content)
        except Exception:
            logger.exception("WhatsApp completion failed for lead %s", lead_id)
            reply = "Thanks — I'll look into that and get back to you shortly."
        ai_row = lead_service.add_message(lead_id, sender="ai", content=reply, channel=body.channel)
        message = dashboard_presenter.present_message(ai_row)
    else:
        # a human is already handling this thread — don't talk over them
        message = None

    updated_row = _fetch_lead_row(lead_id)
    return {"message": message, "lead": _present_full_lead(updated_row)}


@router.post("/leads/{lead_id}/takeover")
async def takeover(lead_id: str) -> dict:
    _fetch_lead_row(lead_id)
    lead_service.set_conversation_status(lead_id, "human_handling")
    lead_service.add_message(
        lead_id,
        sender="system",
        content="A human agent has joined the conversation.",
        channel="whatsapp",
    )
    return _present_full_lead(_fetch_lead_row(lead_id))


@router.post("/leads/{lead_id}/assign")
async def assign(lead_id: str, body: AssignRequest) -> dict:
    _fetch_lead_row(lead_id)
    lead_service.assign_agent(lead_id, body.agentName)
    return _present_full_lead(_fetch_lead_row(lead_id))


@router.post("/leads/{lead_id}/calls")
async def request_call(lead_id: str) -> dict:
    _fetch_lead_row(lead_id)
    lead_service.set_call_status(lead_id, "requested")
    return _present_full_lead(_fetch_lead_row(lead_id))


@router.post("/viewings")
async def book_viewing(body: ViewingBookRequest) -> dict:
    row = _fetch_lead_row(body.leadId)
    try:
        booking = await calendar_service.book_slot(
            start=body.slotId,
            attendee_name=row.get("caller_name"),
            attendee_phone=row.get("caller_phone"),
            attendee_email=None,
            notes=body.notes,
        )
    except calendar_service.CalendarNotConfigured as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except calendar_service.CalendarError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    updated = get_db().table("leads").update({
        "status": "appointment_booked",
        "appointment_at": booking.get("start"),
        "booking_uid": booking.get("booking_uid"),
    }).eq("id", body.leadId).execute()
    updated_row = (updated.data or [row])[0]

    viewing = dashboard_presenter.present_viewing(updated_row)
    if viewing is None:
        raise HTTPException(status_code=502, detail="booking confirmed but could not be recorded")
    return viewing
