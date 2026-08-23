import json

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import comps_service
from app.services.money import parse_budget_max, parse_budget_range

client = TestClient(app)

# kept so the tests that exercise real index loading can undo the fixture's stub
load_index = comps_service.load_index

INDEX = {
    "source": "NAPIC Open Transaction Data (Kuala Lumpur)",
    "period": {"from": "2021-01", "to": "2026-03"},
    "entries": [
        {
            "area": "TMN TUN DR ISMAIL",
            "mukim": "Mukim Kuala Lumpur",
            "property_type": "Terraced",
            "transactions": 208,
            "median_price": 1560000,
            "low_price": 950000,
            "high_price": 3180000,
            "median_psf": 919,
            "median_sqft": 1798,
            "tenure": ["Freehold"],
            "latest_transaction": "2026-01",
        },
        {
            "area": "TMN TUN DR ISMAIL",
            "mukim": "Mukim Kuala Lumpur",
            "property_type": "Condominium/Apartment",
            "transactions": 40,
            "median_price": 700000,
            "low_price": 500000,
            "high_price": 900000,
            "median_psf": 600,
            "median_sqft": 1100,
            "tenure": ["Freehold", "Leasehold"],
            "latest_transaction": "2025-11",
        },
        {
            "area": "RESIDENSI PUNCAK TTDI",
            "mukim": "Mukim Kuala Lumpur",
            "property_type": "Semi-Detached",
            "transactions": 8,
            "median_price": 2970000,
            "low_price": 2500000,
            "high_price": 3400000,
            "median_psf": 755,
            "median_sqft": 3900,
            "tenure": ["Freehold"],
            "latest_transaction": "2025-06",
        },
        {
            "area": "SRI PETALING",
            "mukim": "Mukim Petaling",
            "property_type": "Condominium/Apartment",
            "transactions": 12,
            "median_price": 450000,
            "low_price": 300000,
            "high_price": 620000,
            "median_psf": 430,
            "median_sqft": 1000,
            "tenure": ["Leasehold"],
            "latest_transaction": "2025-08",
        },
    ],
}


@pytest.fixture(autouse=True)
def index(monkeypatch):
    monkeypatch.setattr(comps_service, "load_index", lambda: INDEX)
    return INDEX


def test_exact_area_match_returns_transacted_prices():
    result = comps_service.find_comps("Taman Tun Dr Ismail")
    assert result["match"] == "exact"
    assert result["source"].startswith("NAPIC")
    # most-transacted comp first
    assert result["comps"][0]["median_price"] == 1560000
    assert result["comps"][0]["transactions"] == 208


def test_napic_abbreviations_and_caller_spelling_match():
    assert comps_service.find_comps("TMN TUN DR ISMAIL")["match"] == "exact"
    assert comps_service.find_comps("taman tun dr. ismail")["match"] == "exact"


def test_acronym_matches_scheme_name_over_a_namesake_project():
    """`TTDI` means the taman, not Residensi Puncak TTDI's 8 sales."""
    result = comps_service.find_comps("TTDI")
    assert result["match"] == "partial"
    assert result["comps"][0]["area"] == "TMN TUN DR ISMAIL"


def test_partial_name_matches():
    result = comps_service.find_comps("Sri Petaling")
    assert result["match"] == "exact"
    result = comps_service.find_comps("Bandar Baru Sri Petaling")
    assert result["match"] == "partial"
    assert result["comps"][0]["area"] == "SRI PETALING"


def test_typo_falls_back_to_fuzzy_match():
    result = comps_service.find_comps("Sri Petalling")
    assert result["match"] == "fuzzy"
    assert result["comps"][0]["area"] == "SRI PETALING"


def test_mukim_name_returns_its_schemes():
    result = comps_service.find_comps("Mukim Petaling")
    assert result["match"] == "mukim"
    assert result["area_matched"] == "Mukim Petaling"
    assert [comp["area"] for comp in result["comps"]] == ["SRI PETALING"]


def test_unknown_area_refuses_to_estimate():
    result = comps_service.find_comps("Atlantis")
    assert result["comps"] == []
    assert result["match"] == "none"
    assert "do not estimate" in result["instruction"]


def test_blank_area_is_not_a_match():
    assert comps_service.find_comps("")["match"] == "none"


def test_property_type_filters_comps():
    result = comps_service.find_comps("Taman Tun Dr Ismail", property_type="condo")
    assert [comp["property_type"] for comp in result["comps"]] == ["Condominium/Apartment"]


def test_unsold_property_type_falls_back_to_other_types():
    """An area with no sales of that type is better than no answer at all."""
    result = comps_service.find_comps("Sri Petaling", property_type="bungalow")
    assert [comp["property_type"] for comp in result["comps"]] == ["Condominium/Apartment"]


def test_budget_ranks_affordable_areas_first_and_flags_the_rest():
    result = comps_service.find_comps("Taman Tun Dr Ismail", budget_range="RM800k")
    assert result["budget"] == {"min": None, "max": 800000}
    assert result["comps"][0]["median_price"] == 700000
    assert result["comps"][0]["within_budget"] is True
    assert result["comps"][1]["within_budget"] is False


def test_budget_below_range_is_flagged_out_of_budget():
    result = comps_service.find_comps("Sri Petaling", budget_range="RM900k to 1.2m")
    assert result["comps"][0]["within_budget"] is False


def test_limit_caps_the_number_of_comps():
    assert len(comps_service.find_comps("Mukim Kuala Lumpur", limit=1)["comps"]) == 1


@pytest.fixture
def real_loader(monkeypatch):
    """Load the index off disk for real, with the cache cleared either side."""
    monkeypatch.setattr(comps_service, "load_index", load_index)
    load_index.cache_clear()
    yield load_index
    load_index.cache_clear()


def test_missing_index_file_degrades_quietly(real_loader, monkeypatch, tmp_path):
    monkeypatch.setattr(comps_service, "INDEX_PATH", tmp_path / "absent.json")
    assert real_loader() == {"entries": []}
    assert comps_service.find_comps("Sri Petaling")["comps"] == []


def test_malformed_index_is_rejected(real_loader, monkeypatch, tmp_path):
    path = tmp_path / "comps_index.json"
    path.write_text(json.dumps(["not", "a", "dict"]))
    monkeypatch.setattr(comps_service, "INDEX_PATH", path)
    assert real_loader() == {"entries": []}


def test_klcc_reaches_the_city_centre_mukim(real_loader):
    """NAPIC never says "KLCC", but callers only ever say "KLCC"."""
    result = comps_service.find_comps("KLCC", property_type="condo")
    assert result["match"] == "mukim"
    assert result["area_matched"] == "Kuala Lumpur Town Centre"
    assert result["comps"]


def test_shipped_index_is_loadable_and_covers_kuala_lumpur(real_loader):
    index = real_loader()
    assert index["transactions"] > 20000
    assert len(index["entries"]) > 1000
    assert all(entry["median_price"] > 0 for entry in index["entries"])


def test_market_endpoint_serves_comps():
    response = client.get("/market/comps", params={"area": "TTDI", "limit": 1})
    assert response.status_code == 200
    assert response.json()["comps"][0]["area"] == "TMN TUN DR ISMAIL"


def test_market_endpoint_requires_an_area():
    assert client.get("/market/comps").status_code == 422


@pytest.mark.parametrize(
    "text, expected",
    [
        ("RM2.5k-3.5k", (2500, 3500)),
        ("500k to 700k", (500000, 700000)),
        ("RM1.2m", (None, 1200000)),
        ("1,500,000", (None, 1500000)),
        ("sekitar 800 ribu", (None, 800000)),
        ("budget 700", (None, 700000)),
        ("not sure yet", (None, None)),
        (None, (None, None)),
    ],
)
def test_budget_parsing(text, expected):
    assert parse_budget_range(text) == expected
    assert parse_budget_max(text) == expected[1]


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("2 - 2 1/2 Storey Terraced", "Terraced"),
        ("Low-Cost Flat", "Flat"),
        ("Semi-Detached", "Semi-Detached"),
        ("bungalow", "Detached"),
        ("condo", "Condominium/Apartment"),
        ("", "Other"),
    ],
)
def test_property_type_grouping(raw, expected):
    assert comps_service.group_type(raw) == expected
