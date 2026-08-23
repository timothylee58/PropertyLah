from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services import calendar_service, lead_service

router = APIRouter()


class BookingRequest(BaseModel):
    preferred_datetime: str
    vapi_call_id: str | None = None
    caller_name: str | None = None
    caller_phone: str | None = None
    caller_email: str | None = None
    notes: str | None = None


@router.get("/calendar/slots")
async def available_slots(
    days_ahead: int | None = Query(default=None, ge=1, le=60),
    limit: int | None = Query(default=None, ge=1, le=20),
):
    try:
        slots = await calendar_service.get_available_slots(days_ahead=days_ahead, limit=limit)
    except calendar_service.CalendarNotConfigured as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except calendar_service.CalendarError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {"slots": slots}


@router.post("/calendar/book")
async def book_slot(booking: BookingRequest):
    try:
        confirmed = await calendar_service.book_slot(
            start=booking.preferred_datetime,
            attendee_name=booking.caller_name,
            attendee_phone=booking.caller_phone,
            attendee_email=booking.caller_email,
            notes=booking.notes,
            metadata={"vapi_call_id": booking.vapi_call_id} if booking.vapi_call_id else None,
        )
    except calendar_service.CalendarNotConfigured as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except calendar_service.CalendarError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    if booking.vapi_call_id:
        lead_service.record_booking(booking.vapi_call_id, confirmed, booking.caller_phone)

    return {"booked": True, **confirmed}
