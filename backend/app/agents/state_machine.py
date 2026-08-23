"""Qualification conversation state machine.

The agent's actual turn-by-turn behaviour is LLM-driven (qualification.py's
system prompt + tool-calling) rather than a rigid script — a real caller
doesn't answer questions in order, and a hard FSM that rejects "wrong" input
would be worse than no FSM. What this module gives instead is a *pure,
deterministic* read of where a lead currently sits in the pipeline, computed
from what's actually been captured on the row so far. The webhook handler
recomputes this on every turn and feeds the caller's next-best-step back to
the model as guidance (see `get_completion(..., state_hint=...)`), so the
conversation stays on track without the LLM having to track state itself —
and the same function is what `lead_service` uses to decide whether a lead
counts as qualified.
"""

from enum import Enum


class ConversationState(str, Enum):
    greeting = "greeting"
    identify_intent = "identify_intent"
    qualify_budget = "qualify_budget"
    qualify_area = "qualify_area"
    qualify_timeline = "qualify_timeline"
    ready_for_viewing = "ready_for_viewing"
    viewing_booked = "viewing_booked"
    maintenance_intake = "maintenance_intake"
    closed = "closed"


# the field on the `leads` row that must be filled before a state is "done"
_REQUIRED_FIELD = {
    ConversationState.identify_intent: "lead_type",
    ConversationState.qualify_budget: "budget_range",
    ConversationState.qualify_area: "preferred_area",
    ConversationState.qualify_timeline: "timeline",
}

_GUIDANCE = {
    ConversationState.greeting: (
        "This is the start of the call. Greet the caller, disclose the recording "
        "notice if you haven't already, and ask whether they're a buyer, a tenant "
        "inquiry, or have a maintenance request."
    ),
    ConversationState.identify_intent: (
        "You don't yet know why the caller is calling. Ask whether they're a "
        "buyer, a tenant inquiry, or have a maintenance request."
    ),
    ConversationState.qualify_budget: "Ask the caller's budget range.",
    ConversationState.qualify_area: "Ask the caller's preferred area(s).",
    ConversationState.qualify_timeline: "Ask the caller's move-in or purchase timeline.",
    ConversationState.ready_for_viewing: (
        "The caller is qualified (budget, area, and timeline are captured). Offer "
        "to check viewing availability with get_available_slots and, if they pick "
        "one, book it with book_appointment."
    ),
    ConversationState.viewing_booked: (
        "A viewing is booked. Confirm the details, ask if there's anything else, "
        "then call create_lead with a final summary before the call ends."
    ),
    ConversationState.maintenance_intake: (
        "This is a maintenance request, not a sale/rental inquiry. Collect the "
        "property reference and a description of the issue, then call create_lead."
    ),
    ConversationState.closed: (
        "Wrap up the call. If create_lead hasn't been called yet with what you've "
        "learned so far, call it now — even an unqualified or incomplete lead "
        "should be saved."
    ),
}


def next_state(lead: dict | None) -> ConversationState:
    """The caller's current step, derived purely from what's on the lead row."""
    lead = lead or {}

    if lead.get("appointment_at"):
        return ConversationState.viewing_booked

    lead_type = lead.get("lead_type")
    if lead_type == "maintenance":
        return ConversationState.maintenance_intake

    if not lead:
        return ConversationState.greeting
    if not lead_type or lead_type == "unknown":
        return ConversationState.identify_intent
    if not lead.get("budget_range"):
        return ConversationState.qualify_budget
    if not lead.get("preferred_area"):
        return ConversationState.qualify_area
    if not lead.get("timeline"):
        return ConversationState.qualify_timeline
    return ConversationState.ready_for_viewing


def required_field(state: ConversationState) -> str | None:
    """Which `leads` column, if any, must be filled to leave this state."""
    return _REQUIRED_FIELD.get(state)


def guidance_for(state: ConversationState) -> str:
    """One line of next-step instruction to feed the model as extra context."""
    return _GUIDANCE[state]


def is_qualified(lead: dict | None) -> bool:
    """True once budget, area, and timeline are all captured (or a viewing is booked)."""
    state = next_state(lead)
    return state in (
        ConversationState.ready_for_viewing,
        ConversationState.viewing_booked,
    )
