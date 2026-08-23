from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CallLog(BaseModel):
    id: Optional[str] = None
    lead_id: Optional[str] = None
    vapi_call_id: str
    direction: str  # "inbound" | "outbound"
    transcript: Optional[str] = None
    duration_seconds: Optional[int] = None
    ended_reason: Optional[str] = None
    consent_disclosed: bool = False
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
