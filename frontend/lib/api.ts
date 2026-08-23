import {
  Lead,
  Listing,
  ViewingSlot,
  Viewing,
  ChatRequest,
  ChatResponse,
  BookingRequest,
  BookingResponse,
  ConversationMessage,
  ConversationStatus,
  CallStatus,
  TimelineEvent,
} from "./types";
import { initialLeads, listings, getViewingSlots, allViewings } from "./mock-data";
import { calculateLeadScore } from "./utils";

const API_BASE =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : "http://localhost:8000";

export const IS_DEMO =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_DEMO_MODE
    ? process.env.NEXT_PUBLIC_DEMO_MODE !== "false"
    : true;

const STORAGE_KEY = "keynest-leads-v2";

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

export async function getLeads(): Promise<Lead[]> {
  if (IS_DEMO) {
    seedLeadsIfEmpty();
    return loadLeads();
  }
  try {
    const res = await fetch(`${API_BASE}/api/leads`, { cache: "no-store" });
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
    const res = await fetch(`${API_BASE}/api/leads/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Live lead failed");
    return (await res.json()) as Lead;
  } catch (err) {
    console.warn("Falling back to demo lead", err);
    return loadLeads().find((l) => l.id === id) || null;
  }
}

export function updateLead(updated: Lead) {
  const leads = loadLeads();
  const idx = leads.findIndex((l) => l.id === updated.id);
  if (idx >= 0) {
    leads[idx] = updated;
  } else {
    leads.unshift(updated);
  }
  saveLeads(leads);
}

export async function getConversations(): Promise<Lead[]> {
  return getLeads();
}

export async function getConversation(id: string): Promise<Lead | null> {
  return getLead(id);
}

export async function getViewings(): Promise<Viewing[]> {
  if (IS_DEMO) {
    return allViewings;
  }
  try {
    const res = await fetch(`${API_BASE}/api/viewings`, { cache: "no-store" });
    if (!res.ok) throw new Error("Live viewings failed");
    return (await res.json()) as Viewing[];
  } catch (err) {
    console.warn("Falling back to demo viewings", err);
    return allViewings;
  }
}

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
        title: `Viewing booked: ${lead.bookedViewing.listing.name}`,
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

export async function takeOverConversation(conversationId: string): Promise<Lead | null> {
  const lead = await getConversation(conversationId);
  if (!lead) return null;

  lead.conversationStatus = "human_handling";
  lead.conversation.push({
    id: `msg-${Date.now()}`,
    conversationId: lead.id,
    sender: "system",
    channel: "whatsapp",
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
  updateLead(lead);
  return lead;
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
  updateLead(lead);
  return lead;
}

export async function requestAiCall(leadId: string): Promise<Lead | null> {
  const lead = await getLead(leadId);
  if (!lead) return null;
  lead.callStatus = "requested";
  lead.timelineEvents = lead.timelineEvents || [];
  lead.timelineEvents.unshift({
    id: `te-${Date.now()}`,
    type: "call_requested",
    title: "AI call requested by agent",
    createdAt: new Date().toISOString(),
  });
  lead.lastActivity = new Date().toISOString();
  updateLead(lead);
  return lead;
}

export async function sendSimulatedInboundMessage(conversationId: string, text: string): Promise<Lead | null> {
  const lead = await getConversation(conversationId);
  if (!lead) return null;

  const now = new Date().toISOString();
  lead.conversation.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    conversationId: lead.id,
    sender: "lead",
    channel: "whatsapp",
    content: text,
    createdAt: now,
    deliveryStatus: "read",
  });
  lead.lastActivity = now;

  const aiReply = generateSimulatedReply(text);
  const aiMessage: ConversationMessage = {
    id: `msg-${Date.now() + 1}-${Math.random().toString(36).slice(2)}`,
    conversationId: lead.id,
    sender: "ai",
    channel: "whatsapp",
    content: aiReply.content,
    createdAt: new Date(Date.now() + 700).toISOString(),
    deliveryStatus: "read",
    metadata: aiReply.metadata,
  };
  lead.conversation.push(aiMessage);

  if (aiReply.qualification) {
    lead.qualification = { ...lead.qualification, ...aiReply.qualification };
  }

  const newScore = calculateLeadScore(lead.qualification);
  lead.score = Math.min(100, newScore);
  lead.scoreLabel = scoreLabelFromScore(lead.score);

  updateLead(lead);
  return lead;
}

function scoreLabelFromScore(score: number): "Hot" | "Warm" | "Nurture" {
  if (score >= 80) return "Hot";
  if (score >= 60) return "Warm";
  return "Nurture";
}

interface SimulatedReply {
  content: string;
  qualification?: Partial<Lead["qualification"]>;
  metadata?: ConversationMessage["metadata"];
}

function generateSimulatedReply(text: string): SimulatedReply {
  const lower = text.toLowerCase();
  if (lower.includes("call")) {
    return {
      content: "Sure — I can arrange a quick call to answer questions. Would you prefer to speak with KeyNest AI or a human property consultant?",
      metadata: { actionType: "call_request" },
    };
  }
  if (lower.includes("human") || lower.includes("agent")) {
    return { content: "Understood. I’m passing you to a human property consultant now. They will continue this conversation shortly." };
  }
  if (lower.includes("photo")) {
    return {
      content: "Of course — here are more photos and the floor plan. Let me know if you’d like to arrange a viewing.",
      metadata: { actionType: "listing_match" },
    };
  }
  if (lower.includes("saya cari") || lower.includes("bajet")) {
    return { content: "Hai! Boleh. Adakah anda sudah mendapat kelulusan pinjaman? Saya juga boleh aturkan sesi lawatan apabila anda sudah ada pilihan." };
  }
  return { content: "Thanks — I’ll look into that and follow up with the best next steps." };
}

// Legacy / live-mode chat support
export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  if (IS_DEMO) {
    return {
      message: "Thanks for your message. I’m reviewing your request.",
    };
  }
  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error("Live chat failed");
    return (await res.json()) as ChatResponse;
  } catch (err) {
    console.warn("Falling back to demo chat", err);
    return { message: "Thanks for your message. I’m reviewing your request." };
  }
}

export async function bookViewing(req: BookingRequest): Promise<BookingResponse> {
  if (IS_DEMO) {
    return { bookingId: `bkg-${Date.now()}`, confirmed: true, appointmentAt: getViewingSlots()[0].appointmentAt };
  }
  try {
    const res = await fetch(`${API_BASE}/api/viewings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error("Live booking failed");
    return (await res.json()) as BookingResponse;
  } catch (err) {
    console.warn("Falling back to demo booking", err);
    return { bookingId: `bkg-${Date.now()}`, confirmed: true, appointmentAt: getViewingSlots()[0].appointmentAt };
  }
}

export { listings, getViewingSlots, allViewings };
