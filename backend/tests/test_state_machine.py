import pytest

from app.agents.state_machine import ConversationState, guidance_for, is_qualified, next_state, required_field


def test_an_empty_lead_is_a_greeting():
    assert next_state(None) == ConversationState.greeting
    assert next_state({}) == ConversationState.greeting


def test_a_lead_with_no_type_yet_needs_intent():
    assert next_state({"id": "x"}) == ConversationState.identify_intent
    assert next_state({"id": "x", "lead_type": "unknown"}) == ConversationState.identify_intent


@pytest.mark.parametrize(
    "row,expected",
    [
        ({"lead_type": "buyer"}, ConversationState.qualify_budget),
        ({"lead_type": "buyer", "budget_range": "RM800k"}, ConversationState.qualify_area),
        (
            {"lead_type": "buyer", "budget_range": "RM800k", "preferred_area": "Mont Kiara"},
            ConversationState.qualify_timeline,
        ),
        (
            {
                "lead_type": "buyer",
                "budget_range": "RM800k",
                "preferred_area": "Mont Kiara",
                "timeline": "within a month",
            },
            ConversationState.ready_for_viewing,
        ),
    ],
)
def test_qualification_steps_fill_in_order(row, expected):
    assert next_state(row) == expected


def test_maintenance_skips_the_qualification_pipeline():
    assert next_state({"lead_type": "maintenance"}) == ConversationState.maintenance_intake
    # even with everything else already known, maintenance never becomes "ready for viewing"
    assert next_state({
        "lead_type": "maintenance",
        "budget_range": "n/a",
        "preferred_area": "n/a",
        "timeline": "n/a",
    }) == ConversationState.maintenance_intake


def test_a_booked_appointment_always_wins():
    row = {"lead_type": "buyer", "appointment_at": "2026-09-01T02:00:00Z"}
    assert next_state(row) == ConversationState.viewing_booked
    # even for an otherwise-unqualified or maintenance row
    assert next_state({"lead_type": "maintenance", "appointment_at": "2026-09-01T02:00:00Z"}) == (
        ConversationState.viewing_booked
    )


def test_required_field_matches_the_qualification_steps():
    assert required_field(ConversationState.identify_intent) == "lead_type"
    assert required_field(ConversationState.qualify_budget) == "budget_range"
    assert required_field(ConversationState.qualify_area) == "preferred_area"
    assert required_field(ConversationState.qualify_timeline) == "timeline"
    assert required_field(ConversationState.ready_for_viewing) is None


def test_every_state_has_guidance():
    for state in ConversationState:
        assert guidance_for(state)


@pytest.mark.parametrize(
    "row,expected",
    [
        (None, False),
        ({"lead_type": "buyer"}, False),
        ({"lead_type": "buyer", "budget_range": "x", "preferred_area": "y", "timeline": "z"}, True),
        ({"lead_type": "buyer", "appointment_at": "2026-09-01T02:00:00Z"}, True),
        ({"lead_type": "maintenance"}, False),
    ],
)
def test_is_qualified(row, expected):
    assert is_qualified(row) is expected
