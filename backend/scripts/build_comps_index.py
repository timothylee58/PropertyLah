"""Turn NAPIC's open transaction export into the comps index the agent queries.

Usage:
    python scripts/build_comps_index.py Open_Transaction_Data.csv

The raw export is a few megabytes of one-row-per-transaction tab-separated text
with prices like `"RM1,600,000.00"`. The agent only ever needs per-area
statistics, so this precomputes them into app/data/comps_index.json (committed)
and the raw export stays out of the repo. Rerun it when NAPIC publishes a newer
quarter.
"""

import argparse
import json
import re
import statistics
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.comps_service import group_type  # noqa: E402

DEFAULT_OUTPUT = Path(__file__).resolve().parent.parent / "app" / "data" / "comps_index.json"

MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
}

SQM_TO_SQFT = 10.7639

# for strata titles NAPIC reports the unit's own area in the parcel-area column
# and leaves the floor-area column empty; for landed property the parcel area is
# the land, so built-up is only known when the floor-area column is filled
STRATA_TYPES = frozenset({"Condominium/Apartment", "Flat", "Serviced Apartment"})

# the export repeats the header name "Unit" for both area columns, so columns are
# read by position rather than by name
COLUMNS = (
    "property_type", "district", "mukim", "scheme", "road", "month", "tenure",
    "parcel_area", "parcel_unit", "floor_area", "floor_unit", "unit_level", "price",
)


def parse_money(raw: str) -> float | None:
    digits = re.sub(r"[^\d.]", "", raw or "")
    try:
        value = float(digits)
    except ValueError:
        return None
    return value if value > 0 else None


def parse_month(raw: str) -> str | None:
    """`August 2024` -> `2024-08`."""
    parts = (raw or "").strip().split()
    if len(parts) != 2:
        return None
    month = MONTHS.get(parts[0].lower())
    if not month or not parts[1].isdigit():
        return None
    return f"{parts[1]}-{month:02d}"


def read_rows(path: Path) -> list[dict]:
    """The export is tab-separated, but prices contain commas and stray quotes."""
    lines = path.read_text(encoding="utf-8-sig", errors="replace").splitlines()
    rows = []
    for line in lines[1:]:
        values = [value.strip().strip('"') for value in line.replace('"', "").split("\t")]
        if len(values) < len(COLUMNS):
            continue
        rows.append(dict(zip(COLUMNS, values)))
    return rows


def built_up_sqft(row: dict, property_type: str) -> float | None:
    """Square feet of living space, where the export lets us know it."""
    floor_area = parse_money(row.get("floor_area", ""))
    if floor_area is None and property_type in STRATA_TYPES:
        floor_area = parse_money(row.get("parcel_area", ""))
    # every area in the export is square metres; bail out if that ever changes
    if floor_area is None or "sq.m" not in (row.get("parcel_unit") or ""):
        return None
    return floor_area * SQM_TO_SQFT


def build_index(rows: list[dict]) -> dict:
    areas: dict[tuple[str, str, str], list[dict]] = defaultdict(list)
    months: list[str] = []

    for row in rows:
        price = parse_money(row.get("price", ""))
        scheme = (row.get("scheme") or row.get("road") or "").strip()
        if not price or not scheme:
            continue
        month = parse_month(row.get("month", ""))
        if month:
            months.append(month)
        property_type = group_type(row.get("property_type", ""))
        areas[(scheme.upper(), (row.get("mukim") or "").strip(), property_type)].append({
            "price": price,
            "sqft": built_up_sqft(row, property_type),
            "month": month,
            "tenure": row.get("tenure") or "",
        })

    entries = [
        _summarise(scheme, mukim, property_type, transactions)
        for (scheme, mukim, property_type), transactions in areas.items()
    ]
    entries.sort(key=lambda entry: (-entry["transactions"], entry["area"]))

    return {
        "source": "NAPIC Open Transaction Data (Kuala Lumpur)",
        "transactions": sum(entry["transactions"] for entry in entries),
        "period": {"from": min(months, default=""), "to": max(months, default="")},
        "entries": entries,
    }


def _summarise(scheme: str, mukim: str, property_type: str, transactions: list[dict]) -> dict:
    prices = sorted(transaction["price"] for transaction in transactions)
    sizes = [transaction["sqft"] for transaction in transactions if transaction["sqft"]]
    per_sqft = [
        transaction["price"] / transaction["sqft"]
        for transaction in transactions
        if transaction["sqft"]
    ]
    tenures = {transaction["tenure"] for transaction in transactions if transaction["tenure"]}
    months = [transaction["month"] for transaction in transactions if transaction["month"]]
    return {
        "area": scheme,
        "mukim": mukim,
        "property_type": property_type,
        "transactions": len(prices),
        "median_price": round(statistics.median(prices)),
        "low_price": round(prices[0]),
        "high_price": round(prices[-1]),
        "median_psf": round(statistics.median(per_sqft)) if per_sqft else None,
        "median_sqft": round(statistics.median(sizes)) if sizes else None,
        "tenure": sorted(tenures),
        "latest_transaction": max(months, default=""),
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path, help="NAPIC open transaction export")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args(argv)

    rows = read_rows(args.csv)
    if not rows:
        print(f"no rows read from {args.csv}", file=sys.stderr)
        return 1

    index = build_index(rows)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(index, separators=(",", ":"), sort_keys=True))
    print(
        f"{index['transactions']} transactions -> {len(index['entries'])} area/type entries "
        f"({index['period']['from']}..{index['period']['to']}) written to {args.output}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
