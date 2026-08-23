from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class BookingRequest(BaseModel):
    lead_id: str
    preferred_datetime: str
    lead_type: str


@router.post("/calendar/book")
async def book_slot(booking: BookingRequest):
    # Fastest path for the hackathon: Cal.com API (simple REST, no OAuth dance)
    # or Google Calendar with a pre-authorized service account.
    # Stubbed here — wire real credentials once picked during Phase 4.
    return {"booked": True, "slot": booking.preferred_datetime, "lead_id": booking.lead_id}
