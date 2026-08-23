import uuid
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, UploadFile, File, Form

from app.core import store
from app.models.dashboard import (
    Lead,
    Viewing,
    Listing,
    ViewingSlot,
    ConversationMessage,
    TimelineEvent,
    MessageMetadata,
    KnowledgeSource,
    AgentRule,
    KnowledgeTestResult,
    InboundMessage,
    AssignRequest,
    CallRequest,
    BookingRequest,
    BookingResponse,
    ChatRequest,
    ChatResponse,
    OverviewData,
    ActivityEvent,
    MessageResponse,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> str:
    return datetime.now().isoformat()


def _new_id(prefix: str) -> str:
    return f"{prefix}-{int(datetime.now().timestamp() * 1000)}-{uuid.uuid4().hex[:6]}"


def _calculate_lead_score(qualification: dict[str, Any]) -> int:
    score = 0
    if qualification.get("financing") == "approved":
        score += 25
    budget_max = qualification.get("budgetMax")
    if budget_max and 300000 <= budget_max <= 3000000:
        score += 20
    timeline_days = qualification.get("timelineDays")
    if timeline_days is not None and timeline_days <= 60:
        score += 20
    location = qualification.get("location")
    if location and str(location).strip():
        score += 15
    if qualification.get("propertyType") and qualification.get("bedrooms") is not None:
        score += 5
    if qualification.get("viewingSelected"):
        score += 20
    return min(100, score)


def _score_label(score: int) -> str:
    if score >= 80:
        return "Hot"
    if score >= 60:
        return "Warm"
    return "Nurture"


def _rule_reply(text: str) -> tuple[str, dict[str, Any] | None]:
    lower = text.lower()
    if "call" in lower:
        return (
            "Sure — I can arrange a quick call to answer questions. Would you prefer to speak with KeyNest AI or a human property consultant?",
            {"actionType": "call_request"},
        )
    if "human" in lower or "agent" in lower:
        return (
            "Understood. I’m passing you to a human property consultant now. They will continue this conversation shortly.",
            None,
        )
    if "photo" in lower:
        return (
            "Of course — here are more photos and the floor plan. Let me know if you’d like to arrange a viewing.",
            {"actionType": "listing_match"},
        )
    if "saya cari" in lower or "bajet" in lower:
        return (
            "Hai! Boleh. Adakah anda sudah mendapat kelulusan pinjaman? Saya juga boleh aturkan sesi lawatan apabila anda sudah ada pilihan.",
            None,
        )
    return (
        "Thanks — I’ll look into that and follow up with the best next steps.",
        None,
    )


def _derive_category(name: str) -> str:
    lower = name.lower()
    if "brochure" in lower:
        return "Property brochure"
    if "listing" in lower or "inventory" in lower:
        return "Inventory"
    if "faq" in lower:
        return "FAQ"
    if "sop" in lower or "policy" in lower:
        return "Agency policy"
    if "napic" in lower or "transaction" in lower or "market" in lower:
        return "Market data"
    return "Other"


def _lead_to_overview_activities(lead: Lead) -> list[ActivityEvent]:
    activities: list[ActivityEvent] = []
    if lead.conversation:
        activities.append(
            ActivityEvent(
                id=f"act-{lead.id}-inquiry",
                title=f"New WhatsApp lead from {lead.name}",
                leadName=lead.name,
                leadId=lead.id,
                createdAt=lead.conversation[0].createdAt,
                type="new_lead",
            )
        )
    if lead.status == "booked" and lead.bookedViewing:
        activities.append(
            ActivityEvent(
                id=f"act-{lead.id}-booking",
                title=f"Viewing booked: {lead.bookedViewing.listing.name}",
                description=lead.bookedViewing.slot.label,
                leadName=lead.name,
                leadId=lead.id,
                createdAt=lead.bookedViewing.appointmentAt,
                type="viewing_booked",
            )
        )
    if lead.status == "qualified":
        activities.append(
            ActivityEvent(
                id=f"act-{lead.id}-qualified",
                title=f"KeyNest qualified {lead.name}",
                description="Budget and financing captured",
                leadName=lead.name,
                leadId=lead.id,
                createdAt=lead.lastActivity,
                type="qualification",
            )
        )
    if lead.callStatus != "not_requested":
        event = next(
            (e for e in (lead.timelineEvents or []) if e.type == "call_requested"), None
        )
        activities.append(
            ActivityEvent(
                id=f"act-{lead.id}-call",
                title=f"AI call requested for {lead.name}",
                description=f"Status: {lead.callStatus}",
                leadName=lead.name,
                leadId=lead.id,
                createdAt=event.createdAt if event else lead.lastActivity,
                type="call_requested",
            )
        )
    return activities


def _merge_lead_dict(lead: Lead, updates: dict[str, Any]) -> Lead:
    data = lead.model_dump()
    data.update(updates)
    return Lead.model_validate(data)


# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------

@router.get("/overview")
async def get_overview() -> OverviewData:
    leads = store.get_leads()
    viewings = store.get_viewings()
    activities: list[ActivityEvent] = []
    for lead in leads[:5]:
        activities.extend(_lead_to_overview_activities(lead))
    activities.sort(key=lambda a: a.createdAt, reverse=True)
    return OverviewData(
        newLeads=12,
        qualifiedLeads=8,
        bookedViewings=4,
        hotLeads=3,
        medianFirstResponse="< 1 min",
        activeConversations=8,
        activities=activities[:10],
        leads=leads,
        viewings=viewings,
    )


# ---------------------------------------------------------------------------
# Leads
# ---------------------------------------------------------------------------

@router.get("/leads")
async def list_leads() -> list[Lead]:
    return store.get_leads()


@router.get("/leads/{lead_id}")
async def get_lead(lead_id: str) -> Lead:
    lead = store.get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/leads/{lead_id}")
async def patch_lead(lead_id: str, updates: dict[str, Any]) -> Lead:
    lead = store.get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    updated = _merge_lead_dict(lead, updates)
    store.update_lead(updated)
    return updated


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------

@router.post("/conversations/{conversation_id}/messages")
async def create_message(conversation_id: str, message: InboundMessage) -> MessageResponse:
    lead = store.get_lead(conversation_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now = _now()
    lead.conversation.append(
        ConversationMessage(
            id=_new_id("msg"),
            conversationId=conversation_id,
            sender="lead",
            channel=message.channel,
            content=message.content,
            createdAt=now,
            deliveryStatus="read",
        )
    )
    lead.lastActivity = now

    ai_content, metadata = _rule_reply(message.content)
    ai_message = ConversationMessage(
        id=_new_id("msg"),
        conversationId=conversation_id,
        sender="ai",
        channel=message.channel,
        content=ai_content,
        createdAt=(datetime.now() + timedelta(milliseconds=700)).isoformat(),
        deliveryStatus="read",
        metadata=MessageMetadata.model_validate(metadata) if metadata else None,
    )
    lead.conversation.append(ai_message)

    if metadata and metadata.get("actionType") == "listing_match":
        lead.recommendedListings = lead.recommendedListings or store.get_listings()

    lead.score = _calculate_lead_score(lead.qualification.model_dump())
    lead.scoreLabel = _score_label(lead.score)

    store.update_lead(lead)
    return MessageResponse(message=ai_message, lead=lead)


@router.post("/conversations/{conversation_id}/takeover")
async def take_over_conversation(conversation_id: str) -> Lead:
    lead = store.get_lead(conversation_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now = _now()
    lead.conversationStatus = "human_handling"
    lead.conversation.append(
        ConversationMessage(
            id=_new_id("msg"),
            conversationId=conversation_id,
            sender="system",
            channel="whatsapp",
            content="A human agent has joined the conversation.",
            createdAt=now,
            deliveryStatus="delivered",
        )
    )
    lead.timelineEvents = lead.timelineEvents or []
    lead.timelineEvents.insert(
        0,
        TimelineEvent(
            id=_new_id("te"),
            type="handover",
            title="Conversation taken over by agent",
            createdAt=now,
        ),
    )
    lead.lastActivity = now
    store.update_lead(lead)
    return lead


@router.post("/conversations/{conversation_id}/assign")
async def assign_conversation(conversation_id: str, req: AssignRequest) -> Lead:
    lead = store.get_lead(conversation_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now = _now()
    lead.assignedAgent = req.agentName
    lead.timelineEvents = lead.timelineEvents or []
    lead.timelineEvents.insert(
        0,
        TimelineEvent(
            id=_new_id("te"),
            type="agent_note",
            title=f"Assigned to {req.agentName}",
            createdAt=now,
            agent=req.agentName,
        ),
    )
    lead.lastActivity = now
    store.update_lead(lead)
    return lead


# ---------------------------------------------------------------------------
# Calls
# ---------------------------------------------------------------------------

@router.post("/calls")
async def request_call(req: CallRequest) -> Lead:
    lead = store.get_lead(req.leadId)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now = _now()
    lead.callStatus = "requested"
    lead.timelineEvents = lead.timelineEvents or []
    lead.timelineEvents.insert(
        0,
        TimelineEvent(
            id=_new_id("te"),
            type="call_requested",
            title="AI call requested by agent",
            createdAt=now,
        ),
    )
    lead.lastActivity = now
    store.update_lead(lead)
    return lead


# ---------------------------------------------------------------------------
# Viewings
# ---------------------------------------------------------------------------

@router.get("/viewings")
async def list_viewings() -> list[Viewing]:
    return store.get_viewings()


@router.post("/viewings")
async def book_viewing(req: BookingRequest) -> BookingResponse:
    lead = store.get_lead(req.leadId)
    listing = store.get_listing(req.listingId)
    slot = store.get_slot(req.slotId)
    if not lead or not listing or not slot:
        raise HTTPException(status_code=404, detail="Lead, listing or slot not found")

    now = _now()
    booking_id = _new_id("bkg")
    viewing = Viewing(
        bookingId=booking_id,
        confirmed=True,
        appointmentAt=slot.appointmentAt,
        leadId=req.leadId,
        listingId=req.listingId,
        slotId=req.slotId,
        listing=listing,
        slot=slot,
        channel="whatsapp",
    )
    store.add_viewing(viewing)

    lead.bookedViewing = viewing
    lead.status = "booked"
    lead.qualification.viewingSelected = True
    lead.score = _calculate_lead_score(lead.qualification.model_dump())
    lead.scoreLabel = _score_label(lead.score)
    lead.lastActivity = now
    lead.conversation.append(
        ConversationMessage(
            id=_new_id("msg"),
            conversationId=lead.id,
            sender="ai",
            channel="whatsapp",
            content=f"✅ Viewing confirmed for {listing.name} at {slot.label}.",
            createdAt=now,
            deliveryStatus="read",
            metadata=MessageMetadata(booking=viewing, actionType="booking"),
            actions=["Viewing booked"],
        )
    )
    lead.timelineEvents = lead.timelineEvents or []
    lead.timelineEvents.insert(
        0,
        TimelineEvent(
            id=_new_id("te"),
            type="viewing_booked",
            title=f"Viewing confirmed: {slot.label}",
            createdAt=now,
        ),
    )
    store.update_lead(lead)

    return BookingResponse(
        bookingId=booking_id,
        confirmed=True,
        appointmentAt=slot.appointmentAt,
    )


# ---------------------------------------------------------------------------
# Chat (legacy live mode)
# ---------------------------------------------------------------------------

@router.post("/chat")
async def chat(req: ChatRequest) -> ChatResponse:
    content, _ = _rule_reply(req.message)
    return ChatResponse(message=content)


# ---------------------------------------------------------------------------
# Knowledge
# ---------------------------------------------------------------------------

def _simulate_indexing(source_id: str) -> None:
    source = store.get_knowledge_source(source_id)
    if source:
        source.status = "Ready"
        source.lastUpdated = _now()
        store.update_knowledge_source(source)


@router.get("/knowledge/sources")
async def list_knowledge_sources() -> list[KnowledgeSource]:
    return store.get_knowledge_sources()


@router.post("/knowledge/upload")
async def upload_knowledge_source(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    category: str = Form(""),
    scope: str = Form("All conversations"),
) -> KnowledgeSource:
    now = _now()
    source_id = _new_id("ks")
    size = len(await file.read()) if file else 0
    await file.seek(0)
    source = KnowledgeSource(
        id=source_id,
        name=file.filename or "unnamed",
        category=category or _derive_category(file.filename or ""),
        scope=scope,
        status="Processing",
        version="1.0",
        lastUpdated=now,
        enabled=True,
        size=f"{max(1, size // 1024)} KB",
        simulated=False,
    )
    store.update_knowledge_source(source)
    background_tasks.add_task(_simulate_indexing, source_id)
    return source


@router.patch("/knowledge/sources/{source_id}")
async def patch_knowledge_source(source_id: str, updates: dict[str, Any]) -> KnowledgeSource:
    source = store.get_knowledge_source(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    data = source.model_dump()
    data.update(updates)
    data["lastUpdated"] = _now()
    updated = KnowledgeSource.model_validate(data)
    store.update_knowledge_source(updated)
    return updated


@router.delete("/knowledge/sources/{source_id}")
async def delete_knowledge_source(source_id: str) -> dict[str, bool]:
    ok = store.delete_knowledge_source(source_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return {"ok": True}


@router.get("/knowledge/rules")
async def list_agent_rules() -> list[AgentRule]:
    return store.get_agent_rules()


@router.post("/knowledge/rules")
async def create_agent_rule(rule: AgentRule) -> AgentRule:
    now = _now()
    rule.createdAt = rule.createdAt or now
    rule.updatedAt = rule.updatedAt or now
    store.update_agent_rule(rule)
    return rule


@router.patch("/knowledge/rules/{rule_id}")
async def patch_agent_rule(rule_id: str, updates: dict[str, Any]) -> AgentRule:
    rule = store.get_agent_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    data = rule.model_dump()
    data.update(updates)
    data["updatedAt"] = _now()
    updated = AgentRule.model_validate(data)
    store.update_agent_rule(updated)
    return updated


@router.delete("/knowledge/rules/{rule_id}")
async def delete_agent_rule(rule_id: str) -> dict[str, bool]:
    ok = store.delete_agent_rule(rule_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"ok": True}


@router.post("/knowledge/test")
async def test_knowledge_agent(query: dict[str, str]) -> KnowledgeTestResult:
    q = query.get("query", "").lower()
    if "swimming pool" in q and "klcc" in q:
        return KnowledgeTestResult(
            query=query["query"],
            answer="KLCC Residences includes a swimming pool and 24-hour security. The listed price is RM780,000, subject to current availability. Would you like me to arrange a viewing?",
            sources=["KLCC_Residences_Brochure.pdf", "Listings_August_2026.csv"],
            rules=["Do not guarantee availability", "Offer viewing for high-intent leads"],
            handoff=False,
        )
    if "listed price" in q or "price" in q:
        return KnowledgeTestResult(
            query=query["query"],
            answer="The listed price for KLCC Residences is RM780,000. Pricing is subject to current availability and the latest inventory source.",
            sources=["Listings_August_2026.csv", "KLCC_Residences_Brochure.pdf"],
            rules=["Do not guarantee availability"],
            handoff=False,
        )
    if "loan" in q or "guarantee" in q or "approved" in q:
        return KnowledgeTestResult(
            query=query["query"],
            answer="I cannot guarantee that your loan will be approved. Financing depends on your bank and personal credit profile. For detailed advice, I can connect you with a human mortgage specialist.",
            sources=["Buyer_FAQ_EN_BM.md"],
            rules=["Do not guarantee financial or legal outcomes", "Escalate regulated questions to a human"],
            handoff=True,
            handoffReason="Regulated financial question",
        )
    if "ejen manusia" in q or "human agent" in q:
        return KnowledgeTestResult(
            query=query["query"],
            answer="Baik — I will stop the qualification and assign you to a human property consultant. They will continue this conversation shortly.",
            sources=["Viewing_and_Handoff_SOP.pdf"],
            rules=["Stop autonomous qualification when human is requested", "Reply in the customer's language"],
            handoff=True,
            handoffReason="Customer requested a human agent",
        )
    return KnowledgeTestResult(
        query=query["query"],
        answer="Thanks for your question. I’ll look that up against the latest agency knowledge base and follow up with a grounded answer.",
        sources=["Listings_August_2026.csv", "Buyer_FAQ_EN_BM.md"],
        rules=["Do not guarantee availability"],
        handoff=False,
    )
