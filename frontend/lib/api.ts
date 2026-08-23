import {
  Lead,
  Listing,
  ViewingSlot,
  ChatRequest,
  ChatResponse,
  BookingRequest,
  BookingResponse,
} from "./types";
import { initialLeads, listings, getViewingSlots } from "./mock-data";

const API_BASE =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : "http://localhost:8000";

export const IS_DEMO =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_DEMO_MODE
    ? process.env.NEXT_PUBLIC_DEMO_MODE !== "false"
    : true;

const STORAGE_KEY = "keynest-leads-v1";

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

export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  if (IS_DEMO) {
    return mockChatResponse(req);
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
    return mockChatResponse(req);
  }
}

export async function bookViewing(req: BookingRequest): Promise<BookingResponse> {
  if (IS_DEMO) {
    return mockBookViewing(req);
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
    return mockBookViewing(req);
  }
}

function mockBookViewing(req: BookingRequest): BookingResponse {
  const listing = listings.find((l) => l.id === req.listingId) || listings[0];
  const slots = getViewingSlots();
  const slot = slots.find((s) => s.id === req.slotId) || slots[0];
  const lead = loadLeads().find((l) => l.id === req.leadId);
  if (lead) {
    const booking = {
      bookingId: `bkg-${Date.now()}`,
      confirmed: true,
      appointmentAt: slot.appointmentAt,
      leadId: lead.id,
      listingId: listing.id,
      slotId: slot.id,
      listing,
      slot,
    };
    lead.bookedViewing = booking;
    lead.status = "booked";
    lead.qualification.viewingSelected = true;
    lead.score = 100;
    lead.lastActivity = new Date().toISOString();
    updateLead(lead);
  }
  return {
    bookingId: `bkg-${Date.now()}`,
    confirmed: true,
    appointmentAt: slot.appointmentAt,
  };
}

function mockChatResponse(req: ChatRequest): ChatResponse {
  const msg = req.message.toLowerCase();

  if (msg.includes("saya cari condo di mont kiara")) {
    return {
      message:
        "Hai! Boleh. Berapakah bajet anda, dan adakah anda sudah mendapat kelulusan pinjaman? Saya juga boleh cadangkan unit dan aturkan sesi lawatan.",
    };
  }

  if (
    msg.includes("sell") ||
    msg.includes("jual") ||
    msg.includes("selling")
  ) {
    return {
      message:
        "I can help you list your property. Which area is your condo in, and what’s your expected asking price?",
    };
  }

  if (req.message.includes("approved") || req.message.includes("loan") || msg.includes("up to")) {
    return {
      message:
        "Perfect. Which area would you prefer most: KLCC, Bukit Bintang, or Mont Kiara? And when are you hoping to move?",
      qualification: { financing: true },
    };
  }

  if (req.message.includes("within") || req.message.includes("month")) {
    return {
      message:
        "Thanks, Aisha. I found two 3-bedroom condos that fit your budget and timeline. Which one would you like to view?",
      qualification: { location: "KLCC / Bukit Bintang", timelineDays: 60 },
      listings,
      leadScore: 85,
      status: "qualified",
    };
  }

  if (msg.includes("view") || listings.some((l) => msg.includes(l.id.split("-")[0]))) {
    return {
      message:
        "Excellent choice. I can arrange a viewing with the listing agent. Which time works best for you?",
      suggestedSlots: getViewingSlots(),
    };
  }

  return {
    message:
      "Great — I can help with that. Are you already pre-approved for financing, or would you be buying with cash?",
    qualification: {
      budgetMax: 800000,
      location: "KLCC",
      propertyType: "Condo",
      bedrooms: 3,
    },
  };
}

export { listings, getViewingSlots };
