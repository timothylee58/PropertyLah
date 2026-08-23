"""Maps Supabase rows onto the shapes the dashboard consumes.

The voice agent stores what a phone call revealed (`leads`, `call_logs`); the
dashboard is written against a richer WhatsApp-era contract (see
frontend/INTEGRATION.md). This module is the seam between the two: it renames
and derives, and leaves genuinely absent data absent instead of inventing it —
there are no listing, conversation or message tables yet.
"""

import re
from datetime import datetime, timezone

from app.models.lead import LeadStatus, LeadType
from app.services.calendar_service import format_slot
from app.services.money import parse_budget_max

HOT_SCORE = 80
WARM_SCORE = 60

# the dashboard's lead pipeline has no "disqualified" column; those leads sit in
# "nurture" alongside anything the agent flagged
_STATUS = {
    LeadStatus.new.value: "new",
    LeadStatus.qualified.value: "qualified",
    LeadStatus.appointment_booked.value: "booked",
    LeadStatus.disqualified.value: "nurture",
    LeadStatus.scam_flagged.value: "nurture",
}

_INTENT = {
    LeadType.buyer.value: "buyer",
    LeadType.tenant.value: "renter",
}

_NEXT_ACTION = {
    "booked": "Confirm the viewing with the owner and send directions.",
    "qualified": "Call back to match listings and offer viewing slots.",
    "nurture": "Keep warm — no budget or timeline captured yet.",
    "new": "Review the call and qualify the lead.",
}


def mask_phone(phone: str | None) -> str:
    """`+60123456789` -> `+60 12-**** 6789`; the dashboard shows no full numbers."""
    if not phone:
        return "Unknown number"
    digits = re.sub(r"\D", "", phone)
    if len(digits) < 6:
        return "****"
    return f"+{digits[:4]}-**** {digits[-4:]}"


def score_label(score: int) -> str:
    if score >= HOT_SCORE:
        return "Hot"
    if score >= WARM_SCORE:
        return "Warm"
    return "Nurture"


def slot_label(iso_timestamp: str | None) -> str:
    """Human wording for an appointment, in the agency's timezone."""
    if not iso_timestamp:
        return "Time to be confirmed"
    try:
        parsed = datetime.fromisoformat(iso_timestamp.replace("Z", "+00:00"))
    except ValueError:
        return "Time to be confirmed"
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    # same wording the voice agent reads out when offering the slot
    return format_slot(parsed)["label"]


def present_message(row: dict) -> dict:
    """One `messages` row as the dashboard's `ConversationMessage`."""
    return {
        "id": str(row.get("id")),
        "conversationId": str(row.get("lead_id")),
        "sender": row.get("sender") or "system",
        "channel": row.get("channel") or "whatsapp",
        "content": row.get("content") or "",
        "createdAt": row.get("created_at") or "",
        "deliveryStatus": row.get("delivery_status") or "sent",
        **({"metadata": row["metadata"]} if row.get("metadata") else {}),
    }


def present_lead(row: dict, transcript: str | None = None, messages: list[dict] | None = None) -> dict:
    """One `leads` row as the dashboard's `Lead`.

    `conversation` and `qualification` are always present because the UI reads
    into them unguarded; a call transcript, when we have one, is surfaced as a
    single system message rather than being split into fake turns. `messages`
    are the WhatsApp-style thread from the `messages` table, when any exist —
    see `POST /api/leads/{id}/messages`.
    """
    score = row.get("qualification_score") or 0
    status = _STATUS.get(row.get("status") or "", "new")
    area = row.get("preferred_area")
    budget_range = row.get("budget_range")
    last_activity = row.get("updated_at") or row.get("created_at") or ""
    lead_id = str(row.get("id") or row.get("vapi_call_id") or "")

    conversation: list[dict] = []
    if transcript:
        conversation.append({
            "id": f"{lead_id}-transcript",
            "conversationId": lead_id,
            "sender": "system",
            "channel": "phone",
            "content": transcript,
            "createdAt": last_activity,
        })
    conversation.extend(present_message(m) for m in (messages or []))

    return {
        "id": lead_id,
        "name": row.get("caller_name") or "Unknown caller",
        "phoneMasked": mask_phone(row.get("caller_phone")),
        "source": "Voice call",
        "channel": "phone",
        "intent": _INTENT.get(row.get("lead_type") or "", row.get("lead_type") or "unknown"),
        "location": area,
        "preferredAreas": [area] if area else [],
        "budget": budget_range,
        "budgetLabel": budget_range or "",
        "budgetMax": parse_budget_max(budget_range),
        "timeline": row.get("timeline"),
        "score": score,
        "scoreLabel": score_label(score),
        "status": status,
        # a phone-only lead is closed by the time it's persisted; once a
        # takeover/message action happens the row itself carries the real state
        "conversationStatus": row.get("conversation_status") or "closed",
        "assignedAgent": row.get("assigned_agent"),
        "aiSummary": row.get("notes") or "No summary captured for this call.",
        "nextBestAction": _NEXT_ACTION[status],
        "callStatus": row.get("call_status") or "completed",
        "lastActivity": last_activity,
        "qualification": {
            "location": area,
            "timeline": row.get("timeline"),
            "budgetMax": parse_budget_max(budget_range),
            "viewingSelected": bool(row.get("appointment_at")),
        },
        "conversation": conversation,
        "timelineEvents": _timeline_events(row, lead_id),
        "bookedViewing": present_viewing(row),
    }


def _timeline_events(row: dict, lead_id: str) -> list[dict]:
    events = [{
        "id": f"{lead_id}-inbound",
        "type": "inquiry",
        "title": "Inbound call received",
        "createdAt": row.get("created_at") or "",
    }]
    if row.get("qualification_score") is not None:
        events.append({
            "id": f"{lead_id}-qualified",
            "type": "qualification",
            "title": f"Qualified by the voice agent — score {row['qualification_score']}",
            "description": row.get("notes"),
            "createdAt": row.get("updated_at") or row.get("created_at") or "",
        })
    if row.get("appointment_at"):
        events.append({
            "id": f"{lead_id}-viewing",
            "type": "viewing_booked",
            "title": f"Viewing booked for {slot_label(row['appointment_at'])}",
            "createdAt": row["appointment_at"],
        })
    events.sort(key=lambda event: event["createdAt"] or "", reverse=True)
    return events


def present_viewing(row: dict) -> dict | None:
    """One `leads` row as the dashboard's `Viewing`, or None if nothing is booked.

    `listing` is omitted: the agent only records a reference string, and the
    dashboard would otherwise render invented property details.
    """
    appointment_at = row.get("appointment_at")
    if not appointment_at:
        return None
    lead_id = str(row.get("id") or row.get("vapi_call_id") or "")
    return {
        "bookingId": row.get("booking_uid") or lead_id,
        "confirmed": True,
        "appointmentAt": appointment_at,
        "leadId": lead_id,
        "listingId": row.get("property_reference") or "",
        "slotId": appointment_at,
        "propertyReference": row.get("property_reference"),
        "slot": {
            "id": appointment_at,
            "label": slot_label(appointment_at),
            "appointmentAt": appointment_at,
        },
        "channel": "phone",
    }


def present_overview(leads: list[dict]) -> dict:
    """Pipeline counters and an activity feed derived from the leads we have."""
    viewings = [viewing for viewing in (lead["bookedViewing"] for lead in leads) if viewing]
    activities: list[dict] = []
    for lead in leads:
        activities.append({
            "id": f"{lead['id']}-new",
            "title": f"New voice lead from {lead['name']}",
            "leadName": lead["name"],
            "leadId": lead["id"],
            "createdAt": lead["lastActivity"],
            "type": "new_lead",
        })
        if lead["bookedViewing"]:
            activities.append({
                "id": f"{lead['id']}-booking",
                "title": f"Viewing booked: {lead['bookedViewing']['slot']['label']}",
                "description": lead["bookedViewing"]["propertyReference"],
                "leadName": lead["name"],
                "leadId": lead["id"],
                "createdAt": lead["bookedViewing"]["appointmentAt"],
                "type": "viewing_booked",
            })
    activities.sort(key=lambda activity: activity["createdAt"] or "", reverse=True)

    return {
        "newLeads": sum(1 for lead in leads if lead["status"] == "new"),
        "qualifiedLeads": sum(1 for lead in leads if lead["status"] == "qualified"),
        "bookedViewings": len(viewings),
        "hotLeads": sum(1 for lead in leads if lead["scoreLabel"] == "Hot"),
        # no first-response metric exists until inbound timestamps are recorded
        "medianFirstResponse": "—",
        "activeConversations": 0,
        "activities": activities[:10],
        "leads": leads,
        "viewings": viewings,
    }
