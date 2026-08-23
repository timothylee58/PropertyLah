"""Comparable transacted prices, answered from NAPIC's open data.

The index is built offline by scripts/build_comps_index.py, so a mid-call comps
lookup is a dictionary hit — no scraping, no external API that can time out, and
every figure is a real registered transaction rather than an asking price.
"""

import difflib
import json
import logging
import re
from functools import lru_cache
from pathlib import Path

from app.services.money import parse_budget_range

logger = logging.getLogger(__name__)

INDEX_PATH = Path(__file__).resolve().parent.parent / "data" / "comps_index.json"

# NAPIC abbreviates; callers don't (and vice versa)
_ABBREVIATIONS = {
    "TMN": "TAMAN",
    "BDR": "BANDAR",
    "JLN": "JALAN",
    "KG": "KAMPUNG",
    "PSN": "PERSIARAN",
    "LRG": "LORONG",
    "APT": "APARTMENT",
    "PJU": "PJU",
    "SEK": "SEKSYEN",
    "BT": "BUKIT",
    "SG": "SUNGAI",
}

# names callers use that appear nowhere in NAPIC's scheme or mukim columns
_AREA_ALIASES = {
    "KLCC": "KUALA LUMPUR TOWN CENTRE",
    "KL CITY CENTRE": "KUALA LUMPUR TOWN CENTRE",
    "CITY CENTRE": "KUALA LUMPUR TOWN CENTRE",
}

# how the agent hears property types vs how the index groups them
TYPE_GROUPS = (
    ("condominium", "Condominium/Apartment"),
    ("condo", "Condominium/Apartment"),
    ("apartment", "Condominium/Apartment"),
    ("apartmen", "Condominium/Apartment"),
    ("serviced", "Serviced Apartment"),
    ("flat", "Flat"),
    ("semi-detached", "Semi-Detached"),
    ("semi d", "Semi-Detached"),
    ("bungalow", "Detached"),
    ("detached", "Detached"),
    ("terraced", "Terraced"),
    ("terrace", "Terraced"),
    ("link", "Terraced"),
    ("town house", "Townhouse"),
    ("townhouse", "Townhouse"),
    ("cluster", "Cluster"),
    ("shop", "Shop"),
)

NO_MATCH_INSTRUCTION = (
    "There is no transaction data for that area — say so plainly, do not estimate "
    "a price, and offer to have an agent follow up with a valuation."
)


def group_type(raw: str) -> str:
    """Collapse a property-type description onto the index's grouping."""
    lowered = (raw or "").lower()
    for needle, label in TYPE_GROUPS:
        if needle in lowered:
            return label
    return (raw or "").strip() or "Other"


@lru_cache(maxsize=1)
def load_index() -> dict:
    try:
        index = json.loads(INDEX_PATH.read_text())
    except (OSError, ValueError):
        logger.exception("could not load the comps index at %s", INDEX_PATH)
        return {"entries": []}
    if not isinstance(index, dict) or not isinstance(index.get("entries"), list):
        logger.error("comps index at %s is not in the expected shape", INDEX_PATH)
        return {"entries": []}
    return index


def _normalise(name: str) -> str:
    """Uppercase, drop punctuation and parentheticals, expand NAPIC's shorthand."""
    cleaned = re.sub(r"\(.*?\)", " ", (name or "").upper())
    cleaned = re.sub(r"[^A-Z0-9 ]", " ", cleaned)
    words = [_ABBREVIATIONS.get(word, word) for word in cleaned.split()]
    name = " ".join(words)
    return _AREA_ALIASES.get(name, name)


def _initials(name: str) -> str:
    """`TAMAN TUN DR ISMAIL` -> `TTDI`, so callers can use the acronym."""
    words = _normalise(name).split()
    return "".join(word[0] for word in words) if len(words) > 1 else ""


def find_comps(
    area: str,
    budget_range: str | None = None,
    property_type: str | None = None,
    limit: int = 3,
) -> dict:
    """Recent comparable transactions for an area, ranked by relevance."""
    index = load_index()
    entries = index.get("entries") or []
    header = {
        "source": index.get("source", "NAPIC Open Transaction Data"),
        "period": index.get("period", {}),
    }

    wanted_type = group_type(property_type) if property_type else None
    if wanted_type:
        typed = [entry for entry in entries if entry.get("property_type") == wanted_type]
        # an area with no sales of that type is better answered with its other
        # types than with nothing at all
        entries = typed or entries

    matched, match_kind = _match_area(area, entries)
    if not matched:
        return {**header, "comps": [], "match": "none", "instruction": NO_MATCH_INSTRUCTION}

    low, high = parse_budget_range(budget_range)
    comps = [_present(entry, low, high) for entry in _rank(matched, low, high)[:limit]]

    return {
        **header,
        "area_matched": comps[0]["area"] if match_kind != "mukim" else matched[0].get("mukim"),
        "match": match_kind,
        "budget": {"min": low, "max": high},
        "comps": comps,
        "instruction": (
            "Quote these as actual transacted prices from government records, "
            "including the number of transactions, and never round them into a "
            "promise about a specific listing."
        ),
    }


def _match_area(area: str, entries: list[dict]) -> tuple[list[dict], str]:
    """Exact name, then substring or acronym, then fuzzy, then the mukim."""
    query = _normalise(area)
    if not query:
        return [], "none"

    exact = [entry for entry in entries if _normalise(entry.get("area", "")) == query]
    if exact:
        return exact, "exact"

    # an acronym is as good a hit as a substring, so both are ranked together:
    # "TTDI" should reach Taman Tun Dr Ismail before Residensi Puncak TTDI
    partial = [
        entry
        for entry in entries
        if query in _normalise(entry.get("area", ""))
        or _normalise(entry.get("area", "")) in query
        or _initials(entry.get("area", "")) == query
    ]
    if partial:
        return partial, "partial"

    names = {_normalise(entry.get("area", "")) for entry in entries}
    close = difflib.get_close_matches(query, sorted(names), n=1, cutoff=0.85)
    if close:
        return [
            entry for entry in entries if _normalise(entry.get("area", "")) == close[0]
        ], "fuzzy"

    in_mukim = [entry for entry in entries if query in _normalise(entry.get("mukim", ""))]
    if in_mukim:
        return in_mukim, "mukim"

    return [], "none"


def _rank(entries: list[dict], low: int | None, high: int | None) -> list[dict]:
    """Most-transacted first; inside the caller's budget wins when they gave one."""
    def key(entry: dict) -> tuple:
        median = entry.get("median_price") or 0
        out_of_budget = bool((high and median > high) or (low and median < low))
        return (out_of_budget, -(entry.get("transactions") or 0), entry.get("area", ""))

    return sorted(entries, key=key)


def _present(entry: dict, low: int | None, high: int | None) -> dict:
    median = entry.get("median_price")
    comp = {
        "area": entry.get("area"),
        "mukim": entry.get("mukim"),
        "property_type": entry.get("property_type"),
        "transactions": entry.get("transactions"),
        "median_price": median,
        "price_range": {"low": entry.get("low_price"), "high": entry.get("high_price")},
        "median_psf": entry.get("median_psf"),
        "median_sqft": entry.get("median_sqft"),
        "tenure": entry.get("tenure") or [],
        "latest_transaction": entry.get("latest_transaction"),
    }
    if median is not None and (low or high):
        comp["within_budget"] = not (
            (high is not None and median > high) or (low is not None and median < low)
        )
    return comp
