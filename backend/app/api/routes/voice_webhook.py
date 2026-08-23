import json
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request

from app.agents import openclaw_tools
from app.agents.qualification import get_completion
from app.config import settings
from app.core.security import verify_vapi_request
from app.services import calendar_service, comps_service, lead_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/llm/chat/completions")
async def llm_completions(request: Request):
    """
    OpenAI-compatible endpoint — set this as Vapi's custom-LLM URL so Qwen
    drives the conversation instead of Vapi's default model.
    """
    raw_body = await request.body()
    if settings.VAPI_VERIFY_LLM_ENDPOINT:
        verify_vapi_request(request, raw_body)
    body = _parse_body(raw_body)
    return get_completion(body.get("messages") or [])


@router.post("/webhook/vapi")
async def vapi_webhook(request: Request):
    """
    Handles Vapi server events: function-call / tool-calls, end-of-call-report,
    status-update. Point Vapi's assistant serverUrl at this route.
    """
    raw_body = await request.body()
    verify_vapi_request(request, raw_body)

    payload = _parse_body(raw_body)
    message = payload.get("message") or {}
    event_type = message.get("type")

    if event_type == "function-call":
        fn = message.get("functionCall") or {}
        result = await dispatch_tool(
            fn.get("name"), _parse_arguments(fn.get("parameters")), message
        )
        return {"result": result}

    if event_type == "tool-calls":
        return {"results": await handle_tool_calls(message)}

    if event_type == "end-of-call-report":
        try:
            lead_service.save_call_log(message)
        except Exception:
            logger.exception("failed to persist end-of-call report")
        return {"received": True}

    return {"received": True}


async def handle_tool_calls(message: dict) -> list[dict]:
    """Newer Vapi tool-call batch format — one result object per tool call id."""
    tool_calls = message.get("toolCallList") or message.get("toolCalls") or []
    results = []
    for call in tool_calls:
        fn = call.get("function") or {}
        result = await dispatch_tool(fn.get("name"), _parse_arguments(fn.get("arguments")), message)
        results.append({"toolCallId": call.get("id"), "result": json.dumps(result)})
    return results


def _parse_body(raw_body: bytes) -> dict:
    try:
        payload = json.loads(raw_body or b"{}")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail="body is not valid JSON") from e
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="body must be a JSON object")
    return payload


def _parse_arguments(arguments: object) -> dict:
    """Arguments arrive as an object from Vapi but as a JSON string from some models."""
    if isinstance(arguments, dict):
        return arguments
    if isinstance(arguments, str) and arguments.strip():
        try:
            parsed = json.loads(arguments)
        except json.JSONDecodeError:
            logger.warning("could not parse tool arguments: %r", arguments[:200])
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _call_context(message: dict) -> tuple[str | None, str | None]:
    call = message.get("call") or {}
    customer = call.get("customer") or {}
    return call.get("id"), customer.get("number")


async def dispatch_tool(name: str | None, params: dict, message: dict) -> dict:
    """A tool must never take the call down — every failure becomes a tool result."""
    try:
        return await _dispatch_tool(name, params, message)
    except Exception as e:
        logger.exception("tool %r failed", name)
        return {
            "error": str(e),
            "instruction": "That lookup failed — do not guess, offer a human callback.",
        }


async def _dispatch_tool(name: str | None, params: dict, message: dict) -> dict:
    call_id, caller_phone = _call_context(message)

    if name == "verify_listing":
        return await openclaw_tools.verify_listing(params.get("property_reference", ""))

    if name == "get_comps":
        return comps_service.find_comps(
            params.get("area", ""),
            params.get("budget_range"),
            params.get("property_type"),
        )

    if name == "get_available_slots":
        return await get_available_slots()

    if name == "book_appointment":
        return await book_appointment(params, call_id, caller_phone)

    if name == "save_lead":
        return save_lead(params, call_id, caller_phone)

    logger.warning("unknown tool requested: %r", name)
    return {"error": f"unknown function {name}"}


async def get_available_slots() -> dict:
    try:
        slots = await calendar_service.get_available_slots()
    except calendar_service.CalendarError as e:
        logger.warning("slot lookup failed: %s", e)
        return {
            "slots": [],
            "error": str(e),
            "instruction": "Tell the caller a human agent will call back to arrange the viewing.",
        }
    if not slots:
        return {
            "slots": [],
            "instruction": "No slots are open in the coming days — offer a human callback instead.",
        }
    return {"slots": slots}


async def book_appointment(params: dict, call_id: str | None, caller_phone: str | None) -> dict:
    start = params.get("preferred_datetime") or params.get("start")
    if not start:
        return {"booked": False, "error": "preferred_datetime is required"}

    existing = _existing_booking(call_id, start)
    if existing:
        return {"booked": True, **existing, "already_booked": True}

    try:
        booking = await calendar_service.book_slot(
            start=start,
            attendee_name=params.get("caller_name"),
            attendee_phone=params.get("caller_phone") or caller_phone,
            attendee_email=params.get("caller_email"),
            notes=params.get("notes"),
            metadata={"vapi_call_id": call_id} if call_id else None,
        )
    except calendar_service.CalendarError as e:
        logger.warning("booking failed: %s", e)
        return {
            "booked": False,
            "error": str(e),
            "instruction": "Apologise, do not promise a time, and offer a human callback.",
        }

    if call_id:
        try:
            lead_service.record_booking(call_id, booking, caller_phone)
        except Exception:
            logger.exception("booking succeeded but could not be linked to the lead")

    return {"booked": True, **booking}


def _existing_booking(call_id: str | None, start: str) -> dict | None:
    """Guard against a retried tool call double-booking the same slot."""
    if not call_id:
        return None
    try:
        lead = lead_service.get_lead_by_call(call_id)
    except Exception:
        logger.exception("could not check for an existing booking")
        return None
    if not lead or not lead.get("booking_uid"):
        return None
    try:
        requested_start = datetime.fromisoformat(start.replace("Z", "+00:00"))
        stored_start = datetime.fromisoformat(
            lead["appointment_at"].replace("Z", "+00:00")
        )
    except (AttributeError, TypeError, ValueError):
        return None
    if requested_start.tzinfo is None or stored_start.tzinfo is None:
        if start != lead.get("appointment_at"):
            return None
    elif requested_start != stored_start:
        return None
    return {"booking_uid": lead["booking_uid"], "start": lead["appointment_at"]}


def save_lead(params: dict, call_id: str | None, caller_phone: str | None) -> dict:
    if not call_id:
        logger.warning("save_lead called without a call id — skipping persistence")
        return {"saved": False, "error": "missing call id"}
    try:
        lead = lead_service.upsert_lead_from_call(call_id, params, caller_phone)
    except Exception:
        logger.exception("failed to save lead")
        return {"saved": False, "error": "lead could not be saved"}
    return {"saved": True, "lead_id": lead.get("id"), "status": lead.get("status")}
