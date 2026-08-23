from fastapi import APIRouter
from app.core.database import get_db

router = APIRouter()


@router.get("/leads")
async def list_leads():
    db = get_db()
    result = db.table("leads").select("*").order("created_at", desc=True).execute()
    return result.data


@router.get("/leads/{lead_id}")
async def get_lead(lead_id: str):
    db = get_db()
    result = db.table("leads").select("*").eq("id", lead_id).single().execute()
    return result.data


@router.get("/calls/{call_id}")
async def get_call(call_id: str):
    db = get_db()
    result = db.table("call_logs").select("*").eq("id", call_id).single().execute()
    return result.data
