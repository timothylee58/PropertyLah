"""Reading Malaysian ringgit amounts out of whatever the caller said."""

import re

_AMOUNT = re.compile(r"(\d[\d,\.]*)\s*(k|m|mil|million|juta|ribu)?", re.IGNORECASE)

_MULTIPLIERS = {
    "k": 1_000,
    "ribu": 1_000,
    "m": 1_000_000,
    "mil": 1_000_000,
    "million": 1_000_000,
    "juta": 1_000_000,
}


def parse_amounts(text: str | None) -> list[int]:
    """Every ringgit figure in `text`, in the order spoken.

    Handles the shorthand leads actually use: `RM2.5k-3.5k`, `500k to 700k`,
    `RM1.2m`, `1,500,000`, `sekitar 800 ribu`. A bare number below 10,000 is
    read as thousands (`budget 700` means RM700k, not RM700).
    """
    amounts = []
    for raw, suffix in _AMOUNT.findall(text or ""):
        try:
            value = float(raw.replace(",", ""))
        except ValueError:
            continue
        if suffix:
            value *= _MULTIPLIERS[suffix.lower()]
        elif value < 10_000:
            value *= 1_000
        amounts.append(round(value))
    return amounts


def parse_budget_range(text: str | None) -> tuple[int | None, int | None]:
    """Best-effort (min, max) from free-text budget; a lone figure is the ceiling."""
    amounts = parse_amounts(text)
    if not amounts:
        return None, None
    if len(amounts) == 1:
        return None, amounts[0]
    return min(amounts), max(amounts)


def parse_budget_max(text: str | None) -> int | None:
    return parse_budget_range(text)[1]
