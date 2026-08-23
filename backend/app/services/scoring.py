"""Deterministic lead-scoring fallback.

`create_lead` (the voice agent's save tool) normally passes its own
`qualification_score` — an LLM judgment call made in the moment, which
reflects nuance a fixed rule set can't (tone, hesitation, how specific the
caller was). That's trusted first. This exists for the calls that never got
that far: a dropped line, an early hang-up, a caller who wouldn't share
details — so the lead still gets a real, explainable score instead of
sitting at 0 or null.
"""

URGENT_TIMELINE_KEYWORDS = (
    "immediately", "asap", "urgent", "urgently",
    "this week", "this month", "1 month", "2 week", "two week",
)

_INTENT_POINTS = 15
_BUDGET_POINTS = 25
_AREA_POINTS = 20
_TIMELINE_URGENT_POINTS = 25
_TIMELINE_KNOWN_POINTS = 15
_VERIFIED_LISTING_POINTS = 10
_VIEWING_BOOKED_POINTS = 20


def compute_lead_score(row: dict) -> int:
    """0-100. Every point maps to one captured, checkable fact — no guessing."""
    row = row or {}
    score = 0

    if row.get("lead_type") in ("buyer", "tenant"):
        score += _INTENT_POINTS

    if row.get("budget_range"):
        score += _BUDGET_POINTS

    if row.get("preferred_area"):
        score += _AREA_POINTS

    timeline = (row.get("timeline") or "").lower()
    if timeline:
        is_urgent = any(keyword in timeline for keyword in URGENT_TIMELINE_KEYWORDS)
        score += _TIMELINE_URGENT_POINTS if is_urgent else _TIMELINE_KNOWN_POINTS

    if row.get("listing_verified"):
        score += _VERIFIED_LISTING_POINTS

    if row.get("appointment_at"):
        score += _VIEWING_BOOKED_POINTS

    return min(100, score)
