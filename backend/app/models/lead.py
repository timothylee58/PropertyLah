from pydantic import BaseModel
from typing import Optional
from enum import Enum


class LeadType(str, Enum):
    buyer = "buyer"
    tenant = "tenant"
    maintenance = "maintenance"
    unknown = "unknown"


class LeadStatus(str, Enum):
    new = "new"
    qualified = "qualified"
    appointment_booked = "appointment_booked"
    disqualified = "disqualified"
    scam_flagged = "scam_flagged"


class Lead(BaseModel):
    id: Optional[str] = None
    caller_phone: Optional[str] = None
    caller_name: Optional[str] = None
    lead_type: LeadType = LeadType.unknown
    budget_range: Optional[str] = None
    preferred_area: Optional[str] = None
    timeline: Optional[str] = None
    language: Optional[str] = None  # "bm" | "en" | "manglish"
    qualification_score: Optional[int] = None  # 0-100
    status: LeadStatus = LeadStatus.new
    property_reference: Optional[str] = None
    listing_verified: Optional[bool] = None
    notes: Optional[str] = None
