import pytest

from app.services import listings_service
from tests.fake_supabase import FakeDb

LISTINGS = [
    {
        "id": "klcc-residences-3br", "name": "KLCC Residences",
        "location": "Jalan Sultan Ismail, Kuala Lumpur", "price": 780000,
        "price_display": "RM780,000", "beds": 3, "baths": 2, "sqft": 1180,
        "property_type": "Condominium", "status": "available",
    },
    {
        "id": "cheras-starter-condo", "name": "Cheras Starter Condo",
        "location": "Cheras, Kuala Lumpur", "price": 485000,
        "price_display": "RM485,000", "beds": 1, "baths": 1, "sqft": 650,
        "property_type": "Condominium", "status": "available",
    },
    {
        "id": "pj-garden-terrace", "name": "PJ Garden Terrace",
        "location": "Petaling Jaya, Selangor", "price": 1050000,
        "price_display": "RM1,050,000", "beds": 4, "baths": 3, "sqft": 1550,
        "property_type": "Terrace house", "status": "available",
    },
    {
        "id": "sold-out-unit", "name": "Sold Out Unit",
        "location": "Cheras, Kuala Lumpur", "price": 300000,
        "price_display": "RM300,000", "beds": 1, "baths": 1, "sqft": 500,
        "property_type": "Condominium", "status": "sold",
    },
]


@pytest.fixture
def db(monkeypatch):
    fake = FakeDb({"listings": [dict(row) for row in LISTINGS]})
    monkeypatch.setattr(listings_service, "get_db", lambda: fake)
    return fake


def test_lists_available_listings_only(db):
    ids = {row["id"] for row in listings_service.list_listings()}
    assert "sold-out-unit" not in ids
    assert "klcc-residences-3br" in ids


def test_filters_by_location_substring(db):
    results = listings_service.list_listings(location="cheras")
    assert [r["id"] for r in results] == ["cheras-starter-condo"]


def test_filters_by_max_price(db):
    results = listings_service.list_listings(max_price=500000)
    assert [r["id"] for r in results] == ["cheras-starter-condo"]


def test_filters_by_bedrooms(db):
    results = listings_service.list_listings(bedrooms=4)
    assert [r["id"] for r in results] == ["pj-garden-terrace"]


def test_filters_by_property_type(db):
    results = listings_service.list_listings(property_type="terrace")
    assert [r["id"] for r in results] == ["pj-garden-terrace"]


def test_results_are_ordered_cheapest_first(db):
    results = listings_service.list_listings()
    prices = [r["price"] for r in results]
    assert prices == sorted(prices)


def test_no_matches_returns_an_empty_list_not_an_error(db):
    assert listings_service.list_listings(location="nowhere") == []


def test_a_lookup_failure_returns_an_empty_list(monkeypatch):
    class ExplodingDb:
        def table(self, name):
            raise RuntimeError("supabase down")

    monkeypatch.setattr(listings_service, "get_db", lambda: ExplodingDb())
    assert listings_service.list_listings() == []


def test_get_listing_by_id(db):
    listing = listings_service.get_listing("klcc-residences-3br")
    assert listing["name"] == "KLCC Residences"


def test_get_listing_missing_id_returns_none(db):
    assert listings_service.get_listing("nope") is None
