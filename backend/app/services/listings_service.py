"""Approved listing inventory, read from Supabase.

This is the `list_listings` tool's backing store — the voice agent must only
ever describe listings that exist here (never invent one), the same rule
`verify_listing`/`openclaw_tools.py` enforces for a single named property.
"""

import logging

from app.core.database import get_db

logger = logging.getLogger(__name__)

LISTING_FIELDS = (
    "id, name, location, price, price_display, beds, baths, sqft, "
    "property_type, description, badge, status"
)


def list_listings(
    location: str | None = None,
    max_price: int | None = None,
    bedrooms: int | None = None,
    property_type: str | None = None,
    limit: int = 5,
) -> list[dict]:
    """Filtered, available-only listings — best matches first (lowest price)."""
    try:
        query = get_db().table("listings").select(LISTING_FIELDS).eq("status", "available")

        if location:
            query = query.ilike("location", f"%{location}%")
        if property_type:
            query = query.ilike("property_type", f"%{property_type}%")
        if bedrooms is not None:
            query = query.eq("beds", bedrooms)
        if max_price is not None:
            query = query.lte("price", max_price)

        result = query.order("price").limit(limit).execute()
    except Exception:
        logger.exception("listings lookup failed")
        return []
    return result.data or []


def get_listing(listing_id: str) -> dict | None:
    try:
        result = (
            get_db()
            .table("listings")
            .select(LISTING_FIELDS)
            .eq("id", listing_id)
            .limit(1)
            .execute()
        )
    except Exception:
        logger.exception("listing lookup failed for %s", listing_id)
        return None
    return (result.data or [None])[0]
