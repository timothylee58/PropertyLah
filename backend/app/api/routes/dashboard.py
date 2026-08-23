"""The `/api/*` surface the staff dashboard calls when demo mode is off.

Kept separate from the raw `/leads` routes, which return Supabase rows as-is for
debugging and other back-office consumers.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.core.database import get_db
from app.services import dashboard_presenter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

LEAD_LIST_LIMIT = 200


def _fetch_leads(limit: int = LEAD_LIST_LIMIT) -> list[dict]:
    result = (
        get_db()
        .table("leads")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


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


@router.get("/leads")
async def list_leads() -> list[dict]:
    return [dashboard_presenter.present_lead(row) for row in _fetch_leads()]


@router.get("/leads/{lead_id}")
async def get_lead(lead_id: str) -> dict:
    result = get_db().table("leads").select("*").eq("id", lead_id).limit(1).execute()
    row = (result.data or [None])[0]
    if not row:
        raise HTTPException(status_code=404, detail="lead not found")
    # a missing transcript must not cost the operator the rest of the lead
    try:
        transcript = _fetch_transcript(lead_id)
    except Exception:
        logger.exception("could not load the transcript for lead %s", lead_id)
        transcript = None
    return dashboard_presenter.present_lead(row, transcript)


@router.get("/viewings")
async def list_viewings() -> list[dict]:
    viewings = (dashboard_presenter.present_viewing(row) for row in _fetch_leads())
    return [viewing for viewing in viewings if viewing]


@router.get("/overview")
async def get_overview() -> dict:
    leads = [dashboard_presenter.present_lead(row) for row in _fetch_leads()]
    return dashboard_presenter.present_overview(leads)
