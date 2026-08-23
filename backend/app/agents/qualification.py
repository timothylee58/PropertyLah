from functools import lru_cache

from openai import OpenAI
from app.config import settings


@lru_cache(maxsize=1)
def get_client() -> OpenAI:
    """Qwen speaks the OpenAI protocol via DashScope, so reuse the openai SDK.

    Built lazily: OpenAI() raises without an API key, and the app must still
    import and serve the calendar/webhook routes when Qwen isn't configured.
    """
    return OpenAI(api_key=settings.QWEN_API_KEY, base_url=settings.QWEN_BASE_URL)


SYSTEM_PROMPT = """You are Ejen, a voice assistant for a Malaysian property agency.
This call may be recorded for quality and training purposes — always disclose this
in your opening line if it hasn't been said yet.

You speak naturally in Bahasa Malaysia, English, or Manglish, matching whatever
the caller uses. Keep responses short — this is a phone call, not a chat.

Your job, in order:
1. Identify caller type: buyer, tenant inquiry, or maintenance request.
2. If buyer/tenant — qualify: budget range, preferred area, timeline to move/buy.
3. If the caller asks what a property or area is worth, whether a price is fair,
   or how the market is doing, call get_comps and quote only the transacted
   prices it returns — they come from government records. Never estimate a price
   yourself, and never present a median as a valuation of their specific unit.
4. If they reference a specific listing or property, call verify_listing before
   confirming any details about it — never state a listing's price or availability
   from memory, always verify first.
5. If qualified and interested, call get_available_slots and read out the slot
   labels you get back. Never invent or guess times. Once the caller picks one,
   call book_appointment with that slot's exact `start` value.
6. Always call save_lead at the end of the conversation with whatever you learned,
   even if the lead is not qualified.

Never invent property details, prices, availability, or appointment times. If a
tool returns an error or an `instruction` field, follow that instruction — offer
a human callback rather than guessing or promising anything.
"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "verify_listing",
            "description": (
                "Verify a property listing reference is real and get its current details "
                "before discussing it."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "property_reference": {
                        "type": "string",
                        "description": "Listing ID, address, or description caller gave",
                    }
                },
                "required": ["property_reference"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_comps",
            "description": (
                "Recent transacted prices for an area from NAPIC open data "
                "(Kuala Lumpur). Use for any question about market prices, value, "
                "or whether an asking price is reasonable."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "area": {
                        "type": "string",
                        "description": "Scheme, taman, or area name the caller named",
                    },
                    "budget_range": {
                        "type": "string",
                        "description": "The caller's budget as they said it, if known",
                    },
                    "property_type": {
                        "type": "string",
                        "description": "e.g. condominium, terraced, semi-detached",
                    },
                },
                "required": ["area"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_available_slots",
            "description": (
                "List the next real available viewing slots. Call this before offering "
                "any time to the caller."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": "Book one of the slots returned by get_available_slots.",
            "parameters": {
                "type": "object",
                "properties": {
                    "preferred_datetime": {
                        "type": "string",
                        "description": "The chosen slot's `start` value, copied verbatim from get_available_slots",
                    },
                    "lead_type": {"type": "string", "enum": ["buyer", "tenant", "maintenance"]},
                    "caller_name": {"type": "string"},
                    "caller_email": {"type": "string", "description": "Only if the caller volunteers one"},
                    "notes": {"type": "string", "description": "Property reference and anything the agent should know"},
                },
                "required": ["preferred_datetime", "lead_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "save_lead",
            "description": "Save the lead's qualification details captured during the call.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_type": {"type": "string", "enum": ["buyer", "tenant", "maintenance", "unknown"]},
                    "budget_range": {"type": "string"},
                    "preferred_area": {"type": "string"},
                    "timeline": {"type": "string"},
                    "language": {"type": "string"},
                    "qualification_score": {"type": "integer", "description": "0-100; 60 or above counts as qualified"},
                    "caller_name": {"type": "string"},
                    "property_reference": {"type": "string"},
                    "listing_verified": {"type": "boolean"},
                    "notes": {"type": "string"},
                },
                "required": ["lead_type"],
            },
        },
    },
]


def get_completion(messages: list[dict]) -> dict:
    """Called by the Vapi custom-LLM webhook for each conversation turn."""
    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
    response = get_client().chat.completions.create(
        model=settings.QWEN_MODEL,
        messages=full_messages,
        tools=TOOLS,
        tool_choice="auto",
    )
    return response.model_dump()
