from fastapi import APIRouter, Request
from app.agents.qualification import get_completion
from app.agents import openclaw_tools
from app.core.database import get_db
import json

router = APIRouter()


@router.post("/llm/chat/completions")
async def llm_completions(request: Request):
    """
    OpenAI-compatible endpoint — set this as Vapi's custom-LLM URL so Qwen
    drives the conversation instead of Vapi's default model.
    """
    body = await request.json()
    result = get_completion(body.get("messages", []))
    return result


@router.post("/webhook/vapi")
async def vapi_webhook(request: Request):
    """
    Handles Vapi server events: function-call, end-of-call-report, status-update.
    Point Vapi's assistant serverUrl at this route.
    """
    payload = await request.json()
    message = payload.get("message", {})
    event_type = message.get("type")

    if event_type == "function-call":
        return await handle_function_call(message)

    if event_type == "end-of-call-report":
        await save_call_log(message)
        return {"received": True}

    return {"received": True}


async def handle_function_call(message: dict):
    fn = message.get("functionCall", {})
    name = fn.get("name")
    params = fn.get("parameters", {})

    if name == "verify_listing":
        result = await openclaw_tools.verify_listing(params.get("property_reference", ""))
        return {"result": result}

    if name == "book_appointment":
        # TODO: wire to Google Calendar / Cal.com API in calendar.py
        return {"result": {"booked": True, "slot": params.get("preferred_datetime")}}

    if name == "save_lead":
        db = get_db()
        db.table("leads").insert(params).execute()
        return {"result": {"saved": True}}

    return {"result": {"error": f"unknown function {name}"}}


async def save_call_log(message: dict):
    db = get_db()
    call = message.get("call", {})
    db.table("call_logs").insert({
        "vapi_call_id": call.get("id"),
        "direction": call.get("type", "inbound"),
        "transcript": message.get("transcript"),
        "duration_seconds": message.get("durationSeconds"),
        "ended_reason": message.get("endedReason"),
        "consent_disclosed": True,
    }).execute()
