import {
  Lead,
  Listing,
  Viewing,
  ViewingSlot,
  KnowledgeSource,
  AgentRule,
} from "@/lib/types";
import {
  initialLeads,
  listings,
  getViewingSlots,
  allViewings,
  initialKnowledgeSources,
  initialAgentRules,
} from "@/lib/mock-data";
import { getSupabase } from "./supabase";

// ---------------------------------------------------------------------------
// In-memory live store (local dev / single-instance). Falls back from
// Supabase if it is not configured. Production deploys should run the
// Supabase schema and set SUPABASE_* env vars.
// ---------------------------------------------------------------------------

let _leads: Lead[] = [];
let _viewings: Viewing[] = [];
let _knowledgeSources: KnowledgeSource[] = [];
let _agentRules: AgentRule[] = [];
let _seeded = false;

function ensureSeed() {
  if (_seeded) return;
  _leads = JSON.parse(JSON.stringify(initialLeads));
  _viewings = JSON.parse(JSON.stringify(allViewings));
  _knowledgeSources = JSON.parse(JSON.stringify(initialKnowledgeSources));
  _agentRules = JSON.parse(JSON.stringify(initialAgentRules));
  _seeded = true;
}

// Generic Supabase helpers using a `data` jsonb column.
async function loadRows<T extends { id: string }>(
  table: string,
  fallback: T[]
): Promise<T[]> {
  const sb = getSupabase();
  if (!sb) return fallback;
  try {
    const { data, error } = await sb.from(table).select("data");
    if (error) throw error;
    return (data?.map((row: { data: T }) => row.data) as T[]) || [];
  } catch (err) {
    console.warn(`Supabase ${table} read failed, using in-memory.`, err);
    return fallback;
  }
}

async function saveRow<T extends { id: string }>(table: string, item: T) {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from(table).upsert({ id: item.id, data: item as unknown as Record<string, unknown> });
  } catch (err) {
    console.warn(`Supabase ${table} upsert failed.`, err);
  }
}

async function deleteRow(table: string, id: string) {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from(table).delete().eq("id", id);
  } catch (err) {
    console.warn(`Supabase ${table} delete failed.`, err);
  }
}

const TABLES = {
  leads: "keynest_leads",
  viewings: "keynest_viewings",
  sources: "keynest_knowledge_sources",
  rules: "keynest_agent_rules",
};

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export async function getLeads(): Promise<Lead[]> {
  ensureSeed();
  if (!getSupabase()) return _leads;
  return loadRows(TABLES.leads, _leads);
}

export async function getLead(id: string): Promise<Lead | null> {
  const all = await getLeads();
  return all.find((l) => l.id === id) || null;
}

export async function updateLead(lead: Lead): Promise<Lead> {
  ensureSeed();
  const idx = _leads.findIndex((l) => l.id === lead.id);
  if (idx >= 0) _leads[idx] = lead;
  else _leads.unshift(lead);
  await saveRow(TABLES.leads, lead);
  return lead;
}

// ---------------------------------------------------------------------------
// Viewings
// ---------------------------------------------------------------------------

export async function getViewings(): Promise<Viewing[]> {
  ensureSeed();
  if (!getSupabase()) return _viewings;
  return loadRows(TABLES.viewings, _viewings);
}

export async function addViewing(viewing: Viewing): Promise<Viewing> {
  ensureSeed();
  _viewings.push(viewing);
  await saveRow(TABLES.viewings, viewing);
  return viewing;
}

// ---------------------------------------------------------------------------
// Listings / slots
// ---------------------------------------------------------------------------

export function getListings(): Listing[] {
  return listings;
}

export function searchListings(filter: {
  location?: string;
  maxPrice?: number;
  bedrooms?: number;
  propertyType?: string;
}): Listing[] {
  return listings.filter((l) => {
    if (l.status && l.status !== "available") return false;
    if (filter.location) {
      const loc = (l.location || "").toLowerCase();
      if (!loc.includes(filter.location.toLowerCase())) return false;
    }
    if (filter.maxPrice != null && l.price > filter.maxPrice) return false;
    if (filter.bedrooms != null) {
      const beds = l.bedrooms ?? l.beds;
      if (beds !== filter.bedrooms) return false;
    }
    if (filter.propertyType) {
      const pt = (l.propertyType || "").toLowerCase();
      const wanted = filter.propertyType.toLowerCase();
      if (!pt.includes(wanted)) return false;
    }
    return true;
  });
}

export function getListing(id: string): Listing | null {
  return listings.find((l) => l.id === id) || null;
}

export function getSlots(): ViewingSlot[] {
  return getViewingSlots();
}

export function getSlot(id: string): ViewingSlot | null {
  return getViewingSlots().find((s) => s.id === id) || null;
}

// ---------------------------------------------------------------------------
// Knowledge sources
// ---------------------------------------------------------------------------

export async function getKnowledgeSources(): Promise<KnowledgeSource[]> {
  ensureSeed();
  if (!getSupabase()) return _knowledgeSources;
  return loadRows(TABLES.sources, _knowledgeSources);
}

export async function getKnowledgeSource(id: string): Promise<KnowledgeSource | null> {
  const all = await getKnowledgeSources();
  return all.find((s) => s.id === id) || null;
}

export async function updateKnowledgeSource(source: KnowledgeSource): Promise<KnowledgeSource> {
  ensureSeed();
  const idx = _knowledgeSources.findIndex((s) => s.id === source.id);
  if (idx >= 0) _knowledgeSources[idx] = source;
  else _knowledgeSources.unshift(source);
  await saveRow(TABLES.sources, source);
  return source;
}

export async function deleteKnowledgeSource(id: string): Promise<boolean> {
  ensureSeed();
  const before = _knowledgeSources.length;
  _knowledgeSources = _knowledgeSources.filter((s) => s.id !== id);
  if (_knowledgeSources.length < before) {
    await deleteRow(TABLES.sources, id);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Agent rules
// ---------------------------------------------------------------------------

export async function getAgentRules(): Promise<AgentRule[]> {
  ensureSeed();
  if (!getSupabase()) return _agentRules;
  return loadRows(TABLES.rules, _agentRules);
}

export async function getAgentRule(id: string): Promise<AgentRule | null> {
  const all = await getAgentRules();
  return all.find((r) => r.id === id) || null;
}

export async function updateAgentRule(rule: AgentRule): Promise<AgentRule> {
  ensureSeed();
  const idx = _agentRules.findIndex((r) => r.id === rule.id);
  if (idx >= 0) _agentRules[idx] = rule;
  else _agentRules.unshift(rule);
  await saveRow(TABLES.rules, rule);
  return rule;
}

export async function deleteAgentRule(id: string): Promise<boolean> {
  ensureSeed();
  const before = _agentRules.length;
  _agentRules = _agentRules.filter((r) => r.id !== id);
  if (_agentRules.length < before) {
    await deleteRow(TABLES.rules, id);
    return true;
  }
  return false;
}
