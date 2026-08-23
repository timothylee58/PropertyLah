import {
  Lead,
  Listing,
  ViewingSlot,
  Viewing,
  AgentResponse,
  AgentChatRequest,
  BookingRequest,
  BookingResponse,
  ConversationMessage,
  TimelineEvent,
  KnowledgeSource,
  AgentRule,
  KnowledgeTestResult,
} from "./types";
import {
  initialLeads,
  listings,
  getViewingSlots as getSeedViewingSlots,
  allViewings,
  initialKnowledgeSources,
  initialAgentRules,
} from "./mock-data";
import { calculateLeadScore } from "./utils";

const API_BASE =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : "";

function apiPath(path: string): string {
  if (!API_BASE) return `/api${path}`;
  const base = API_BASE.replace(/\/$/, "");
  return `${base}/api${path}`;
}

// The backend's proxy.ts gates every /api/* route (except /api/health)
// behind a shared key. This is a stopgap, not real per-operator auth — see
// the caveat in frontend/INTEGRATION.md and lib/server/env.ts.
function authHeaders(): Record<string, string> {
  const key =
    typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_DASHBOARD_API_KEY : undefined;
  return key ? { "X-Api-Key": key } : {};
}

async function fetchApi(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers as Record<string, string> | undefined) },
  });
}

export const IS_DEMO =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_DEMO_MODE
    ? process.env.NEXT_PUBLIC_DEMO_MODE !== "false"
    : true;

const STORAGE_KEY = "keynest-leads-v2";
const VIEWINGS_KEY = "keynest-viewings-v1";

function isClient() {
  return typeof window !== "undefined";
}

export function loadLeads(): Lead[] {
  if (!isClient()) return initialLeads;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Lead[];
  } catch {
    // ignore
  }
  return initialLeads;
}

export function seedLeadsIfEmpty() {
  if (!isClient()) return;
  if (!localStorage.getItem(STORAGE_KEY)) {
    saveLeads(initialLeads);
  }
}

function saveLeads(leads: Lead[]) {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  } catch {
    // ignore
  }
}

function loadViewings(): Viewing[] {
  if (!isClient()) return allViewings;
  try {
    const raw = localStorage.getItem(VIEWINGS_KEY);
    if (raw) return JSON.parse(raw) as Viewing[];
  } catch {
    // ignore
  }
  return allViewings;
}

function seedViewingsIfEmpty() {
  if (!isClient()) return;
  if (!localStorage.getItem(VIEWINGS_KEY)) {
    saveViewings(allViewings);
  }
}

function saveViewings(viewings: Viewing[]) {
  if (!isClient()) return;
  try {
    localStorage.setItem(VIEWINGS_KEY, JSON.stringify(viewings));
  } catch {
    // ignore
  }
}

const KNOWLEDGE_SOURCES_KEY = "keynest-knowledge-sources-v1";
const AGENT_RULES_KEY = "keynest-agent-rules-v1";

function seedKnowledgeIfEmpty() {
  if (!isClient()) return;
  if (!localStorage.getItem(KNOWLEDGE_SOURCES_KEY)) {
    saveKnowledgeSources(initialKnowledgeSources);
  }
}

function seedRulesIfEmpty() {
  if (!isClient()) return;
  if (!localStorage.getItem(AGENT_RULES_KEY)) {
    saveAgentRules(initialAgentRules);
  }
}

function loadKnowledgeSources(): KnowledgeSource[] {
  if (!isClient()) return initialKnowledgeSources;
  try {
    const raw = localStorage.getItem(KNOWLEDGE_SOURCES_KEY);
    if (raw) return JSON.parse(raw) as KnowledgeSource[];
  } catch {
    // ignore
  }
  return initialKnowledgeSources;
}

function saveKnowledgeSources(sources: KnowledgeSource[]) {
  if (!isClient()) return;
  try {
    localStorage.setItem(KNOWLEDGE_SOURCES_KEY, JSON.stringify(sources));
  } catch {
    // ignore
  }
}

function loadAgentRules(): AgentRule[] {
  if (!isClient()) return initialAgentRules;
  try {
    const raw = localStorage.getItem(AGENT_RULES_KEY);
    if (raw) return JSON.parse(raw) as AgentRule[];
  } catch {
    // ignore
  }
  return initialAgentRules;
}

function saveAgentRules(rules: AgentRule[]) {
  if (!isClient()) return;
  try {
    localStorage.setItem(AGENT_RULES_KEY, JSON.stringify(rules));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface HealthCheckResult {
  ok: boolean;
  mode: "demo" | "live";
  qwenConfigured: boolean;
  hermesConfigured: boolean;
  supabaseConfigured: boolean;
}

export async function healthCheck(): Promise<HealthCheckResult> {
  try {
    const res = await fetchApi(apiPath("/health"), { cache: "no-store" });
    if (!res.ok) throw new Error("Health check failed");
    return (await res.json()) as HealthCheckResult;
  } catch (err) {
    console.warn("Health check failed", err);
    return {
      ok: true,
      mode: IS_DEMO ? "demo" : "live",
      qwenConfigured: false,
      hermesConfigured: false,
      supabaseConfigured: false,
    };
  }
}

// ---------------------------------------------------------------------------
// Agent chat
// ---------------------------------------------------------------------------

function scoreLabelFromScore(score: number): "Hot" | "Warm" | "Nurture" {
  if (score >= 80) return "Hot";
  if (score >= 60) return "Warm";
  return "Nurture";
}

export async function sendAgentMessage(req: AgentChatRequest): Promise<AgentResponse> {
  const res = await fetchApi(apiPath("/agent/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Agent chat failed");
  }
  return (await res.json()) as AgentResponse;
}

export async function sendSimulatedInboundMessage(conversationId: string, text: string): Promise<Lead | null> {
  const lead = await getConversation(conversationId);
  if (!lead) return null;

  const now = new Date().toISOString();
  const userMessage: ConversationMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    conversationId: lead.id,
    sender: "lead",
    channel: lead.channel,
    content: text,
    createdAt: now,
    deliveryStatus: "read",
  };

  lead.conversation.push(userMessage);
  lead.lastActivity = now;

  const req: AgentChatRequest = {
    sessionId: lead.id,
    leadId: lead.id,
    leadName: lead.name,
    channel: lead.channel,
    message: text,
    conversation: lead.conversation,
    qualification: lead.qualification,
  };

  let response: AgentResponse;
  try {
    response = await sendAgentMessage(req);
  } catch (err) {
    console.warn("Agent chat failed, using fallback", err);
    response = {
      message: "Thanks — I’ll look into that and get back to you shortly.",
      sessionId: lead.id,
      leadId: lead.id,
      conversationStatus: "ai_handling",
      actions: [],
    };
  }

  const aiMessage: ConversationMessage = {
    id: `msg-${Date.now() + 1}-${Math.random().toString(36).slice(2)}`,
    conversationId: lead.id,
    sender: "ai",
    channel: lead.channel,
    content: response.message,
    createdAt: new Date(Date.now() + 700).toISOString(),
    deliveryStatus: "read",
    metadata: {
      listings: response.listings,
      slots: response.suggestedSlots,
      booking: response.viewing,
      actionType: response.actions?.[0],
    },
    actions: response.actions?.map((a) => actionDisplay(a)),
  };

  lead.conversation.push(aiMessage);

  if (response.qualification) {
    lead.qualification = { ...lead.qualification, ...response.qualification };
  }
  if (response.listings) {
    lead.recommendedListings = response.listings;
  }
  if (response.suggestedSlots) {
    // Cache slots on the lead so the inbox can render them.
    lead.recommendedListings = lead.recommendedListings;
  }
  if (response.viewing) {
    lead.bookedViewing = response.viewing;
  }
  if (response.leadScore != null) lead.score = response.leadScore;
  if (response.leadStatus) lead.status = response.leadStatus;
  if (response.conversationStatus) lead.conversationStatus = response.conversationStatus;
  if (response.nextBestAction) lead.nextBestAction = response.nextBestAction;
  if (response.handoffRequired) lead.conversationStatus = "human_handling";
  if (response.actions?.includes("call_request")) lead.callStatus = "requested";
  if (response.actions?.includes("handoff")) {
    lead.conversationStatus = "human_handling";
    lead.timelineEvents = lead.timelineEvents || [];
    lead.timelineEvents.unshift({
      id: `te-${Date.now()}`,
      type: "handover",
      title: "Conversation handed to human agent",
      createdAt: now,
    });
  }

  if (response.viewing) {
    lead.status = "booked";
    lead.timelineEvents = lead.timelineEvents || [];
    lead.timelineEvents.unshift({
      id: `te-${Date.now()}`,
      type: "viewing_booked",
      title: `Viewing confirmed: ${response.viewing.slot.label}`,
      createdAt: now,
    });

    // Persist the viewing for demo mode.
    if (IS_DEMO) {
      const viewings = loadViewings();
      viewings.unshift(response.viewing);
      saveViewings(viewings);
    }
  }

  if (response.leadScore == null) {
    const newScore = calculateLeadScore(lead.qualification);
    lead.score = Math.min(100, newScore);
  }
  lead.scoreLabel = scoreLabelFromScore(lead.score);

  // Build an AI summary when qualified.
  if (!lead.aiSummary || lead.score >= 60) {
    lead.aiSummary = buildAiSummary(lead);
  }

  await updateLead(lead);
  return lead;
}

function actionDisplay(action: string): string {
  switch (action) {
    case "qualification":
      return "Qualification captured";
    case "listing_match":
      return "Matched listings";
    case "booking":
      return "Viewing booked";
    case "call_request":
      return "Call requested";
    case "handoff":
      return "Handed to human";
    case "knowledge_lookup":
      return "Knowledge lookup";
    default:
      return action;
  }
}

function buildAiSummary(lead: Lead): string {
  const q = lead.qualification;
  const parts = [
    lead.name,
    q.financing ? `is a ${q.financing} ${lead.intent}` : `is a ${lead.intent}`,
    q.budgetMax ? `with a budget up to RM${q.budgetMax.toLocaleString()}` : "",
    q.preferredAreas?.length ? `looking in ${q.preferredAreas.join(" or ")}` : "",
    q.bedrooms ? `for a ${q.bedrooms}-bedroom ${q.propertyType || "property"}` : "",
    q.timeline ? `and a move timeline of ${q.timeline}.` : ".",
  ];
  return parts.filter(Boolean).join(" ").replace(/  +/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export async function searchListings(filter: {
  location?: string;
  maxPrice?: number;
  bedrooms?: number;
  propertyType?: string;
}): Promise<Listing[]> {
  if (IS_DEMO) return listings;
  try {
    const res = await fetchApi(apiPath("/listings/search"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filter),
    });
    if (!res.ok) throw new Error("Live listing search failed");
    const data = (await res.json()) as { listings: Listing[] };
    return data.listings;
  } catch (err) {
    console.warn("Falling back to demo listings", err);
    return listings;
  }
}

// ---------------------------------------------------------------------------
// Viewings
// ---------------------------------------------------------------------------

export async function getViewingSlots(leadId?: string, listingId?: string): Promise<ViewingSlot[]> {
  if (IS_DEMO) return getSeedViewingSlots();
  try {
    const params = new URLSearchParams();
    if (leadId) params.set("leadId", leadId);
    if (listingId) params.set("listingId", listingId);
    const res = await fetchApi(apiPath(`/viewings/slots?${params.toString()}`), { cache: "no-store" });
    if (!res.ok) throw new Error("Live slots failed");
    const data = (await res.json()) as { slots: ViewingSlot[] };
    return data.slots;
  } catch (err) {
    console.warn("Falling back to demo slots", err);
    return getSeedViewingSlots();
  }
}

export async function createViewing(req: BookingRequest): Promise<BookingResponse> {
  if (IS_DEMO) {
    const listing = listings.find((l) => l.id === req.listingId) || listings[0];
    const slot = getSeedViewingSlots().find((s) => s.id === req.slotId) || getSeedViewingSlots()[0];
    const bookingId = `bkg-${Date.now()}`;
    const viewing: Viewing = {
      bookingId,
      id: bookingId,
      confirmed: true,
      appointmentAt: slot.appointmentAt,
      leadId: req.leadId,
      listingId: req.listingId,
      slotId: req.slotId,
      listing,
      slot,
      channel: req.channel || "whatsapp",
      status: "confirmed",
    };
    const viewings = loadViewings();
    viewings.unshift(viewing);
    saveViewings(viewings);

    const lead = await getLead(req.leadId);
    if (lead) {
      lead.bookedViewing = viewing;
      lead.status = "booked";
      lead.score = calculateLeadScore(lead.qualification);
      lead.scoreLabel = scoreLabelFromScore(lead.score);
      lead.nextBestAction =
        "Send the property brochure before the viewing and offer a follow-up call.";
      lead.lastActivity = new Date().toISOString();
      lead.timelineEvents = lead.timelineEvents || [];
      lead.timelineEvents.unshift({
        id: `te-${Date.now()}`,
        type: "viewing_booked",
        title: `Viewing confirmed: ${slot.label}`,
        createdAt: new Date().toISOString(),
      });
      await updateLead(lead);
    }

    const channelName = viewing.channel === "telegram" ? "Telegram" : "WhatsApp";
    return {
      bookingId: viewing.bookingId,
      confirmed: true,
      appointmentAt: slot.appointmentAt,
      viewing,
      confirmationMessage: `✅ Viewing confirmed for ${listing.name} ${slot.label.toLowerCase()}. I’ve sent the confirmation and calendar details here on ${channelName}.`,
      leadScore: lead?.score ?? 85,
      leadStatus: "booked",
      nextBestAction: "Send the property brochure before the viewing and offer a follow-up call.",
    };
  }

  try {
    const res = await fetchApi(apiPath("/viewings"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error("Live booking failed");
    return (await res.json()) as BookingResponse;
  } catch (err) {
    console.warn("Falling back to demo booking", err);
    return createViewing({ ...req });
  }
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export async function getLeads(): Promise<Lead[]> {
  if (IS_DEMO) {
    seedLeadsIfEmpty();
    return loadLeads();
  }
  try {
    const res = await fetchApi(apiPath("/leads"), { cache: "no-store" });
    if (!res.ok) throw new Error("Live leads failed");
    return (await res.json()) as Lead[];
  } catch (err) {
    console.warn("Falling back to demo leads", err);
    return loadLeads();
  }
}

export async function getLead(id: string): Promise<Lead | null> {
  if (IS_DEMO) {
    return loadLeads().find((l) => l.id === id) || null;
  }
  try {
    const res = await fetchApi(apiPath(`/leads/${id}`), { cache: "no-store" });
    if (!res.ok) throw new Error("Live lead failed");
    return (await res.json()) as Lead;
  } catch (err) {
    console.warn("Falling back to demo lead", err);
    return loadLeads().find((l) => l.id === id) || null;
  }
}

export async function updateLead(updated: Lead): Promise<Lead> {
  if (!IS_DEMO) {
    try {
      const res = await fetchApi(apiPath(`/leads/${updated.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error("Live lead update failed");
      return (await res.json()) as Lead;
    } catch (err) {
      console.warn("Falling back to demo lead update", err);
    }
  }
  const leads = loadLeads();
  const idx = leads.findIndex((l) => l.id === updated.id);
  if (idx >= 0) {
    leads[idx] = updated;
  } else {
    leads.unshift(updated);
  }
  saveLeads(leads);
  return updated;
}

export async function getConversations(): Promise<Lead[]> {
  return getLeads();
}

export async function getConversation(id: string): Promise<Lead | null> {
  return getLead(id);
}

export async function getViewings(): Promise<Viewing[]> {
  if (IS_DEMO) {
    seedViewingsIfEmpty();
    return loadViewings();
  }
  try {
    const res = await fetchApi(apiPath("/viewings"), { cache: "no-store" });
    if (!res.ok) throw new Error("Live viewings failed");
    return (await res.json()) as Viewing[];
  } catch (err) {
    console.warn("Falling back to demo viewings", err);
    return loadViewings();
  }
}

export async function takeOverConversation(conversationId: string): Promise<Lead | null> {
  const lead = await getConversation(conversationId);
  if (!lead) return null;

  lead.conversationStatus = "human_handling";
  lead.conversation.push({
    id: `msg-${Date.now()}`,
    conversationId: lead.id,
    sender: "system",
    channel: lead.channel,
    content: "A human agent has joined the conversation.",
    createdAt: new Date().toISOString(),
    deliveryStatus: "delivered",
  });
  lead.timelineEvents = lead.timelineEvents || [];
  lead.timelineEvents.unshift({
    id: `te-${Date.now()}`,
    type: "handover",
    title: "Conversation taken over by agent",
    createdAt: new Date().toISOString(),
  });
  lead.lastActivity = new Date().toISOString();
  return updateLead(lead);
}

export async function assignLead(leadId: string, agentName: string): Promise<Lead | null> {
  const lead = await getLead(leadId);
  if (!lead) return null;
  lead.assignedAgent = agentName;
  lead.timelineEvents = lead.timelineEvents || [];
  lead.timelineEvents.unshift({
    id: `te-${Date.now()}`,
    type: "agent_note",
    title: `Assigned to ${agentName}`,
    createdAt: new Date().toISOString(),
    agent: agentName,
  });
  lead.lastActivity = new Date().toISOString();
  return updateLead(lead);
}

export async function requestAiCall(leadId: string, callType: "ai" | "human" = "ai", listingId?: string): Promise<Lead | null> {
  const lead = await getLead(leadId);
  if (!lead) return null;

  if (!IS_DEMO) {
    try {
      const res = await fetchApi(apiPath(`/leads/${leadId}/call-request`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callType, listingId }),
      });
      if (!res.ok) throw new Error("Live call request failed");
      const body = (await res.json()) as { lead?: Lead; elevenLabs?: { ok: boolean; error?: string } };
      if (body.lead) return body.lead;
    } catch (err) {
      console.warn("Falling back to demo call request", err);
    }
  }

  lead.callStatus = "requested";
  lead.timelineEvents = lead.timelineEvents || [];
  lead.timelineEvents.unshift({
    id: `te-${Date.now()}`,
    type: "call_requested",
    title: callType === "human" ? "Human call requested" : "AI call requested",
    createdAt: new Date().toISOString(),
  });
  lead.lastActivity = new Date().toISOString();
  return updateLead(lead);
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export interface OverviewData {
  newLeads: number;
  qualifiedLeads: number;
  bookedViewings: number;
  hotLeads: number;
  medianFirstResponse: string;
  activeConversations: number;
  activities: ActivityEvent[];
  leads: Lead[];
  viewings: Viewing[];
}

export interface ActivityEvent {
  id: string;
  title: string;
  description?: string;
  leadName: string;
  leadId: string;
  createdAt: string;
  type: "qualification" | "listing_match" | "viewing_booked" | "new_lead" | "call_requested" | "ai_response";
}

export async function getOverview(): Promise<OverviewData> {
  if (!IS_DEMO) {
    try {
      const res = await fetchApi(apiPath("/overview"), { cache: "no-store" });
      if (!res.ok) throw new Error("Live overview failed");
      return (await res.json()) as OverviewData;
    } catch (err) {
      console.warn("Falling back to demo overview", err);
    }
  }

  const leads = await getLeads();
  const viewings = await getViewings();
  const activities: ActivityEvent[] = [];

  for (const lead of leads.slice(0, 5)) {
    if (lead.conversation.length > 0) {
      activities.push({
        id: `act-${lead.id}-inquiry`,
        title: `New WhatsApp lead from ${lead.name}`,
        leadName: lead.name,
        leadId: lead.id,
        createdAt: lead.conversation[0].createdAt,
        type: "new_lead",
      });
    }
    if (lead.status === "booked" && lead.bookedViewing) {
      activities.push({
        id: `act-${lead.id}-booking`,
        title: `Viewing booked: ${lead.bookedViewing.listing?.name || lead.bookedViewing.propertyReference || "property to be confirmed"}`,
        description: `${lead.bookedViewing.slot.label}`,
        leadName: lead.name,
        leadId: lead.id,
        createdAt: lead.bookedViewing.appointmentAt,
        type: "viewing_booked",
      });
    }
    if (lead.status === "qualified") {
      activities.push({
        id: `act-${lead.id}-qualified`,
        title: `KeyNest qualified ${lead.name}`,
        description: "Budget and financing captured",
        leadName: lead.name,
        leadId: lead.id,
        createdAt: lead.lastActivity,
        type: "qualification",
      });
    }
    if (lead.callStatus !== "not_requested") {
      const event = lead.timelineEvents?.find((e) => e.type === "call_requested");
      activities.push({
        id: `act-${lead.id}-call`,
        title: `AI call requested for ${lead.name}`,
        description: `Status: ${lead.callStatus}`,
        leadName: lead.name,
        leadId: lead.id,
        createdAt: event ? event.createdAt : lead.lastActivity,
        type: "call_requested",
      });
    }
  }

  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    newLeads: 12,
    qualifiedLeads: 8,
    bookedViewings: 4,
    hotLeads: 3,
    medianFirstResponse: "< 1 min",
    activeConversations: 8,
    activities: activities.slice(0, 10),
    leads,
    viewings,
  };
}

// ---------------------------------------------------------------------------
// Knowledge & Rules
// ---------------------------------------------------------------------------

export interface KnowledgeUploadMetadata {
  category: KnowledgeSource["category"];
  scope: string;
}

export async function getKnowledgeSources(): Promise<KnowledgeSource[]> {
  if (IS_DEMO) {
    seedKnowledgeIfEmpty();
    return loadKnowledgeSources();
  }
  try {
    const res = await fetchApi(apiPath("/knowledge/sources"), { cache: "no-store" });
    if (!res.ok) throw new Error("Live knowledge sources failed");
    return (await res.json()) as KnowledgeSource[];
  } catch (err) {
    console.warn("Falling back to demo knowledge sources", err);
    return loadKnowledgeSources();
  }
}

function deriveCategoryFromFileName(name: string): KnowledgeSource["category"] {
  const lower = name.toLowerCase();
  if (lower.includes("brochure")) return "Property brochure";
  if (lower.includes("listing") || lower.includes("inventory")) return "Inventory";
  if (lower.includes("faq")) return "FAQ";
  if (lower.includes("sop") || lower.includes("policy")) return "Agency policy";
  if (lower.includes("napic") || lower.includes("transaction") || lower.includes("market")) return "Market data";
  return "Other";
}

export async function uploadKnowledgeSource(
  file: File,
  metadata?: Partial<KnowledgeUploadMetadata>
): Promise<KnowledgeSource> {
  if (IS_DEMO) {
    const now = new Date().toISOString();
    const id = `ks-${Date.now()}`;
    const category = metadata?.category || deriveCategoryFromFileName(file.name);
    const source: KnowledgeSource = {
      id,
      name: file.name,
      category,
      scope: metadata?.scope || "All conversations",
      status: "Processing",
      version: "1.0",
      lastUpdated: now,
      enabled: true,
      size: `${(file.size / 1024).toFixed(0)} KB`,
      simulated: true,
    };
    const sources = loadKnowledgeSources();
    sources.unshift(source);
    saveKnowledgeSources(sources);

    // Simulate extraction / indexing flow
    setTimeout(() => {
      const current = loadKnowledgeSources();
      const idx = current.findIndex((s) => s.id === id);
      if (idx >= 0) {
        current[idx] = { ...current[idx], status: "Indexing" };
        saveKnowledgeSources(current);
      }
    }, 1200);

    setTimeout(() => {
      const current = loadKnowledgeSources();
      const idx = current.findIndex((s) => s.id === id);
      if (idx >= 0) {
        current[idx] = { ...current[idx], status: "Ready" };
        saveKnowledgeSources(current);
      }
    }, 3500);

    return source;
  }

  const formData = new FormData();
  formData.append("file", file);
  if (metadata?.category) formData.append("category", metadata.category);
  if (metadata?.scope) formData.append("scope", metadata.scope);
  try {
    const res = await fetchApi(apiPath("/knowledge/sources"), {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Live knowledge upload failed");
    return (await res.json()) as KnowledgeSource;
  } catch (err) {
    console.warn("Falling back to demo knowledge upload", err);
    return uploadKnowledgeSource(file, metadata);
  }
}

export async function updateKnowledgeSource(
  id: string,
  updates: Partial<KnowledgeSource>
): Promise<KnowledgeSource | null> {
  if (IS_DEMO) {
    const sources = loadKnowledgeSources();
    const idx = sources.findIndex((s) => s.id === id);
    if (idx < 0) return null;
    sources[idx] = { ...sources[idx], ...updates, lastUpdated: new Date().toISOString() };
    saveKnowledgeSources(sources);
    return sources[idx];
  }
  try {
    const res = await fetchApi(apiPath(`/knowledge/sources/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Live knowledge update failed");
    return (await res.json()) as KnowledgeSource;
  } catch (err) {
    console.warn("Falling back to demo knowledge update", err);
    return updateKnowledgeSource(id, updates);
  }
}

export async function toggleKnowledgeSource(id: string, enabled: boolean): Promise<KnowledgeSource | null> {
  return updateKnowledgeSource(id, { enabled, status: enabled ? "Ready" : "Disabled" });
}

export async function deleteKnowledgeSource(id: string): Promise<boolean> {
  if (IS_DEMO) {
    const sources = loadKnowledgeSources().filter((s) => s.id !== id);
    saveKnowledgeSources(sources);
    return true;
  }
  try {
    const res = await fetchApi(apiPath(`/knowledge/sources/${id}`), { method: "DELETE" });
    return res.ok;
  } catch (err) {
    console.warn("Falling back to demo knowledge delete", err);
    return deleteKnowledgeSource(id);
  }
}

export async function getAgentRules(): Promise<AgentRule[]> {
  if (IS_DEMO) {
    seedRulesIfEmpty();
    return loadAgentRules();
  }
  try {
    const res = await fetchApi(apiPath("/agent/rules"), { cache: "no-store" });
    if (!res.ok) throw new Error("Live agent rules failed");
    return (await res.json()) as AgentRule[];
  } catch (err) {
    console.warn("Falling back to demo agent rules", err);
    return loadAgentRules();
  }
}

export async function createAgentRule(rule: Omit<AgentRule, "id" | "createdAt" | "updatedAt">): Promise<AgentRule> {
  if (IS_DEMO) {
    const now = new Date().toISOString();
    const newRule: AgentRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    const rules = loadAgentRules();
    rules.unshift(newRule);
    saveAgentRules(rules);
    return newRule;
  }
  try {
    const res = await fetchApi(apiPath("/agent/rules"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rule),
    });
    if (!res.ok) throw new Error("Live create rule failed");
    return (await res.json()) as AgentRule;
  } catch (err) {
    console.warn("Falling back to demo create rule", err);
    return createAgentRule(rule);
  }
}

export async function updateAgentRule(
  id: string,
  updates: Partial<AgentRule>
): Promise<AgentRule | null> {
  if (IS_DEMO) {
    const rules = loadAgentRules();
    const idx = rules.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    rules[idx] = { ...rules[idx], ...updates, updatedAt: new Date().toISOString() };
    saveAgentRules(rules);
    return rules[idx];
  }
  try {
    const res = await fetchApi(apiPath(`/agent/rules/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Live update rule failed");
    return (await res.json()) as AgentRule;
  } catch (err) {
    console.warn("Falling back to demo update rule", err);
    return updateAgentRule(id, updates);
  }
}

export async function deleteAgentRule(id: string): Promise<boolean> {
  if (IS_DEMO) {
    const rules = loadAgentRules().filter((r) => r.id !== id);
    saveAgentRules(rules);
    return true;
  }
  try {
    const res = await fetchApi(apiPath(`/agent/rules/${id}`), { method: "DELETE" });
    return res.ok;
  } catch (err) {
    console.warn("Falling back to demo delete rule", err);
    return deleteAgentRule(id);
  }
}

export async function testKnowledgeAgent(query: string): Promise<KnowledgeTestResult> {
  if (!IS_DEMO) {
    try {
      const res = await fetchApi(apiPath("/knowledge/test"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error("Live knowledge test failed");
      const data = (await res.json()) as {
        answer: string;
        sourcesUsed: { name: string }[];
        rulesApplied: { title: string }[];
        handoff?: boolean;
        handoffReason?: string;
      };
      return {
        query,
        answer: data.answer,
        sources: data.sourcesUsed.map((s) => s.name),
        rules: data.rulesApplied.map((r) => r.title),
        handoff: data.handoff,
        handoffReason: data.handoffReason,
      };
    } catch (err) {
      console.warn("Falling back to demo knowledge test", err);
    }
  }
  const lower = query.toLowerCase();

  if (lower.includes("swimming pool") && lower.includes("klcc")) {
    return {
      query,
      answer:
        "KLCC Residences includes a swimming pool and 24-hour security. The listed price is RM780,000, subject to current availability. Would you like me to arrange a viewing?",
      sources: ["KLCC_Residences_Brochure.pdf", "Listings_August_2026.csv"],
      rules: ["Do not guarantee availability", "Offer viewing for high-intent leads"],
      handoff: false,
    };
  }

  if (lower.includes("listed price") || lower.includes("price")) {
    return {
      query,
      answer:
        "The listed price for KLCC Residences is RM780,000. Pricing is subject to current availability and the latest inventory source.",
      sources: ["Listings_August_2026.csv", "KLCC_Residences_Brochure.pdf"],
      rules: ["Do not guarantee availability"],
      handoff: false,
    };
  }

  if (lower.includes("loan") || lower.includes("guarantee") || lower.includes("approved")) {
    return {
      query,
      answer:
        "I cannot guarantee that your loan will be approved. Financing depends on your bank and personal credit profile. For detailed advice, I can connect you with a human mortgage specialist.",
      sources: ["Buyer_FAQ_EN_BM.md"],
      rules: ["Do not guarantee financial or legal outcomes", "Escalate regulated questions to a human"],
      handoff: true,
      handoffReason: "Regulated financial question",
    };
  }

  if (lower.includes("ejen manusia") || lower.includes("human agent")) {
    return {
      query,
      answer:
        "Baik — I will stop the qualification and assign you to a human property consultant. They will continue this conversation shortly.",
      sources: ["Viewing_and_Handoff_SOP.pdf"],
      rules: ["Stop autonomous qualification when human is requested", "Reply in the customer’s language"],
      handoff: true,
      handoffReason: "Customer requested a human agent",
    };
  }

  return {
    query,
    answer:
      "Thanks for your question. I’ll look that up against the latest agency knowledge base and follow up with a grounded answer.",
    sources: ["Listings_August_2026.csv", "Buyer_FAQ_EN_BM.md"],
    rules: ["Do not guarantee availability"],
    handoff: false,
  };
}

export function getLeadKnowledgeUsage(lead: Lead): { sources: string[]; rules: string[] } {
  if (lead.sourcesUsed?.length) {
    return {
      sources: lead.sourcesUsed.map((s) => s.name),
      rules: lead.rulesApplied?.map((r) => r.title) || [],
    };
  }
  if (lead.id === "aisha-rahman") {
    return {
      sources: ["Listings_August_2026.csv", "KLCC_Residences_Brochure.pdf"],
      rules: ["Offer viewing for high-intent leads", "Do not guarantee availability"],
    };
  }
  return {
    sources: ["Listings_August_2026.csv"],
    rules: ["Reply in the customer’s language"],
  };
}

export { listings, allViewings };
