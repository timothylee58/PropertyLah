from openai import OpenAI
from app.config import settings

# Qwen exposes an OpenAI-compatible endpoint via DashScope — reuse the openai SDK
client = OpenAI(api_key=settings.QWEN_API_KEY, base_url=settings.QWEN_BASE_URL)

SYSTEM_PROMPT = """You are Ejen, a voice assistant for a Malaysian property agency.
This call may be recorded for quality and training purposes — always disclose this
in your opening line if it hasn't been said yet.

You speak naturally in Bahasa Malaysia, English, or Manglish, matching whatever
the caller uses. Keep responses short — this is a phone call, not a chat.

Your job, in order:
1. Identify caller type: buyer, tenant inquiry, or maintenance request.
2. If buyer/tenant — qualify: budget range, preferred area, timeline to move/buy.
3. If they reference a specific listing or property, call verify_listing before
   confirming any details about it — never state a listing's price or availability
   from memory, always verify first.
4. If qualified and interested, call book_appointment to offer real available slots.
5. Always call save_lead at the end of the conversation with whatever you learned,
   even if the lead is not qualified.

Never invent property details, prices, or availability. If verify_listing fails
or the listing looks inconsistent, tell the caller honestly and offer to have a
human agent follow up instead of guessing.
"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "verify_listing",
            "description": "Verify a property listing reference is real and get its current details before discussing it.",
            "parameters": {
                "type": "object",
                "properties": {
                    "property_reference": {"type": "string", "description": "Listing ID, address, or description caller gave"}
                },
                "required": ["property_reference"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": "Book a viewing or consultation appointment for the caller.",
            "parameters": {
                "type": "object",
                "properties": {
                    "preferred_datetime": {"type": "string"},
                    "lead_type": {"type": "string", "enum": ["buyer", "tenant", "maintenance"]},
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
                    "qualification_score": {"type": "integer"},
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
    response = client.chat.completions.create(
        model=settings.QWEN_MODEL,
        messages=full_messages,
        tools=TOOLS,
        tool_choice="auto",
    )
    return response.model_dump()
