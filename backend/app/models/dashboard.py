from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field, ConfigDict


class Qualification(BaseModel):
    budgetMin: Optional[int] = None
    budgetMax: Optional[int] = None
    location: Optional[str] = None
    preferredAreas: list[str] = Field(default_factory=list)
    financing: Optional[str] = None
    propertyType: Optional[str] = None
    bedrooms: Optional[int] = None
    timelineDays: Optional[int] = None
    timeline: Optional[str] = None
    viewingSelected: Optional[bool] = None


class Listing(BaseModel):
    id: str
    name: str
    location: str
    price: int
    priceDisplay: str
    beds: int
    baths: int
    sqft: int
    description: str
    image: str
    badge: Optional[str] = None


class ViewingSlot(BaseModel):
    id: str
    label: str
    appointmentAt: str


class Viewing(BaseModel):
    bookingId: str
    confirmed: bool
    appointmentAt: str
    leadId: str
    listingId: str
    slotId: str
    listing: Listing
    slot: ViewingSlot
    channel: Optional[str] = None


class MessageMetadata(BaseModel):
    listings: Optional[list[Listing]] = None
    slots: Optional[list[ViewingSlot]] = None
    booking: Optional[Viewing] = None
    actionType: Optional[str] = None


class ConversationMessage(BaseModel):
    id: str
    conversationId: str
    sender: str
    channel: str
    content: str
    createdAt: str
    deliveryStatus: Optional[str] = None
    metadata: Optional[MessageMetadata] = None
    actions: Optional[list[str]] = None


class TimelineEvent(BaseModel):
    id: str
    type: str
    title: str
    description: Optional[str] = None
    createdAt: str
    agent: Optional[str] = None


class Lead(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    name: str
    phoneMasked: str
    source: str
    channel: str
    intent: str
    location: Optional[str] = None
    preferredAreas: list[str] = Field(default_factory=list)
    budget: Optional[str] = None
    budgetLabel: str
    budgetMax: Optional[int] = None
    propertyType: Optional[str] = None
    bedrooms: Optional[int] = None
    financing: Optional[str] = None
    timeline: Optional[str] = None
    score: int
    scoreLabel: str
    status: str
    conversationStatus: str
    assignedAgent: Optional[str] = None
    aiSummary: str
    nextBestAction: str
    callStatus: str
    lastActivity: str
    qualification: Qualification = Field(default_factory=Qualification)
    conversation: list[ConversationMessage] = Field(default_factory=list)
    recommendedListings: Optional[list[Listing]] = None
    bookedViewing: Optional[Viewing] = None
    timelineEvents: Optional[list[TimelineEvent]] = None


class ChatRequest(BaseModel):
    sessionId: str
    leadId: Optional[str] = None
    message: str


class ChatResponse(BaseModel):
    message: str
    leadId: Optional[str] = None
    qualification: Optional[Qualification] = None
    listings: Optional[list[Listing]] = None
    suggestedSlots: Optional[list[ViewingSlot]] = None
    leadScore: Optional[int] = None
    status: Optional[str] = None
    booking: Optional[Viewing] = None


class BookingRequest(BaseModel):
    leadId: str
    listingId: str
    slotId: str


class BookingResponse(BaseModel):
    bookingId: str
    confirmed: bool
    appointmentAt: str


class KnowledgeSource(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    name: str
    category: str
    scope: str
    status: str
    version: str
    lastUpdated: str
    enabled: bool
    size: Optional[str] = None
    simulated: Optional[bool] = None


class AgentRule(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    title: str
    instruction: str
    priority: str
    category: str
    enabled: bool
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class KnowledgeTestResult(BaseModel):
    query: str
    answer: str
    sources: list[str]
    rules: list[str]
    handoff: Optional[bool] = None
    handoffReason: Optional[str] = None


class ActivityEvent(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    leadName: str
    leadId: str
    createdAt: str
    type: str


class OverviewData(BaseModel):
    newLeads: int
    qualifiedLeads: int
    bookedViewings: int
    hotLeads: int
    medianFirstResponse: str
    activeConversations: int
    activities: list[ActivityEvent]
    leads: list[Lead]
    viewings: list[Viewing]


class InboundMessage(BaseModel):
    content: str
    channel: str


class MessageResponse(BaseModel):
    message: ConversationMessage
    lead: Lead


class TakeoverRequest(BaseModel):
    pass


class AssignRequest(BaseModel):
    agentName: str


class CallRequest(BaseModel):
    leadId: str
    listingId: Optional[str] = None
