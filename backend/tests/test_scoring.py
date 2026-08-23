import pytest

from app.services.scoring import compute_lead_score


def test_an_empty_row_scores_zero():
    assert compute_lead_score({}) == 0
    assert compute_lead_score(None) == 0


def test_score_accumulates_for_each_captured_fact():
    base = {"lead_type": "buyer"}
    with_budget = {**base, "budget_range": "RM800k"}
    with_area = {**with_budget, "preferred_area": "Mont Kiara"}
    with_timeline = {**with_area, "timeline": "within 3 months"}

    assert compute_lead_score(with_budget) > compute_lead_score(base)
    assert compute_lead_score(with_area) > compute_lead_score(with_budget)
    assert compute_lead_score(with_timeline) > compute_lead_score(with_area)


def test_urgent_timeline_scores_higher_than_a_vague_one():
    urgent = compute_lead_score({"timeline": "I need to move in immediately"})
    vague = compute_lead_score({"timeline": "sometime next year maybe"})
    assert urgent > vague


def test_maintenance_leads_get_no_intent_bonus():
    buyer = compute_lead_score({"lead_type": "buyer"})
    maintenance = compute_lead_score({"lead_type": "maintenance"})
    assert buyer > maintenance


def test_a_booked_viewing_scores_a_fully_captured_lead_near_the_top():
    row = {
        "lead_type": "buyer",
        "budget_range": "RM800k",
        "preferred_area": "Mont Kiara",
        "timeline": "asap",
        "listing_verified": True,
        "appointment_at": "2026-09-01T02:00:00Z",
    }
    assert compute_lead_score(row) >= 90


@pytest.mark.parametrize("row", [{"lead_type": "buyer", "budget_range": "x"}] * 3)
def test_score_is_never_below_zero_or_above_a_hundred(row):
    score = compute_lead_score(row)
    assert 0 <= score <= 100
