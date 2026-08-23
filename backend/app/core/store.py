from typing import Any
from app.models.dashboard import Lead, Viewing, KnowledgeSource, AgentRule, Listing, ViewingSlot
from app.seed_data import (
    leads as _seed_leads,
    viewings as _seed_viewings,
    knowledge_sources as _seed_knowledge_sources,
    agent_rules as _seed_agent_rules,
    listings as _seed_listings,
    viewing_slots as _seed_viewing_slots,
)

_leads: list[Lead] = []
_viewings: list[Viewing] = []
_knowledge_sources: list[KnowledgeSource] = []
_agent_rules: list[AgentRule] = []
_listings: list[Listing] = []
_slots: list[ViewingSlot] = []


def set_seed(
    leads: list[dict[str, Any]],
    viewings: list[dict[str, Any]],
    knowledge_sources: list[dict[str, Any]],
    agent_rules: list[dict[str, Any]],
    listings: list[dict[str, Any]],
    slots: list[dict[str, Any]],
):
    global _leads, _viewings, _knowledge_sources, _agent_rules, _listings, _slots
    _leads = [Lead.model_validate(lead) for lead in leads]
    _viewings = [Viewing.model_validate(viewing) for viewing in viewings]
    _knowledge_sources = [KnowledgeSource.model_validate(source) for source in knowledge_sources]
    _agent_rules = [AgentRule.model_validate(rule) for rule in agent_rules]
    _listings = [Listing.model_validate(listing) for listing in listings]
    _slots = [ViewingSlot.model_validate(slot) for slot in slots]


def seed_store() -> None:
    set_seed(
        _seed_leads,
        _seed_viewings,
        _seed_knowledge_sources,
        _seed_agent_rules,
        _seed_listings,
        _seed_viewing_slots,
    )


def get_leads() -> list[Lead]:
    return _leads


def set_leads(leads: list[Lead]) -> None:
    global _leads
    _leads = leads


def get_lead(lead_id: str) -> Lead | None:
    return next((lead for lead in _leads if lead.id == lead_id), None)


def update_lead(lead: Lead) -> None:
    for i, existing_lead in enumerate(_leads):
        if existing_lead.id == lead.id:
            _leads[i] = lead
            return
    _leads.append(lead)


def get_viewings() -> list[Viewing]:
    return _viewings


def add_viewing(viewing: Viewing) -> None:
    _viewings.append(viewing)


def get_knowledge_sources() -> list[KnowledgeSource]:
    return _knowledge_sources


def set_knowledge_sources(sources: list[KnowledgeSource]) -> None:
    global _knowledge_sources
    _knowledge_sources = sources


def get_knowledge_source(source_id: str) -> KnowledgeSource | None:
    return next((s for s in _knowledge_sources if s.id == source_id), None)


def update_knowledge_source(source: KnowledgeSource) -> None:
    for i, s in enumerate(_knowledge_sources):
        if s.id == source.id:
            _knowledge_sources[i] = source
            return
    _knowledge_sources.append(source)


def delete_knowledge_source(source_id: str) -> bool:
    before = len(_knowledge_sources)
    _knowledge_sources = [s for s in _knowledge_sources if s.id != source_id]
    return len(_knowledge_sources) < before


def get_agent_rules() -> list[AgentRule]:
    return _agent_rules


def set_agent_rules(rules: list[AgentRule]) -> None:
    global _agent_rules
    _agent_rules = rules


def get_agent_rule(rule_id: str) -> AgentRule | None:
    return next((r for r in _agent_rules if r.id == rule_id), None)


def update_agent_rule(rule: AgentRule) -> None:
    for i, r in enumerate(_agent_rules):
        if r.id == rule.id:
            _agent_rules[i] = rule
            return
    _agent_rules.append(rule)


def delete_agent_rule(rule_id: str) -> bool:
    before = len(_agent_rules)
    _agent_rules = [r for r in _agent_rules if r.id != rule_id]
    return len(_agent_rules) < before


def get_listings() -> list[Listing]:
    return _listings


def get_listing(listing_id: str) -> Listing | None:
    return next((listing for listing in _listings if listing.id == listing_id), None)


def get_slots() -> list[ViewingSlot]:
    return _slots


def get_slot(slot_id: str) -> ViewingSlot | None:
    return next((s for s in _slots if s.id == slot_id), None)
