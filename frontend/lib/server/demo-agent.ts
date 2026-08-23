import { randomUUID } from "crypto";
import {
  AgentChatRequest,
  AgentResponse,
  Channel,
  ConversationMessage,
  Listing,
  Qualification,
  Viewing,
  ViewingSlot,
} from "@/lib/types";
import { listings, getViewingSlots } from "@/lib/mock-data";
import { calculateLeadScore, scoreLabel } from "./score";
import { searchKnowledge } from "./knowledge";

const AREAS = [
  "KLCC",
  "Bukit Bintang",
  "Mont Kiara",
  "Bangsar",
  "Shah Alam",
  "Setapak",
  "Cheras",
  "Petaling Jaya",
  "Cyberjaya",
];

const SOURCES = [
  { id: "ks-2", name: "Listings_August_2026.csv", category: "inventory" as const },
  { id: "ks-1", name: "KLCC_Residences_Brochure.pdf", category: "brochure" as const },
];

const RULES = [
  { id: "rule-1", title: "Do not guarantee availability", priority: "high" as const },
  { id: "rule-4", title: "Offer viewing to high-intent leads", priority: "medium" as const },
];

function now() {
  return new Date().toISOString();
}

function budgetFromText(text: string): number | undefined {
  const match = text.match(
    /\b(?:budget|bajet|up to|bawah|sehingga|RM|rM|MYR)\s*(?:under|up to|bawah|sehingga)?\s*(?:RM|rM|MYR)?\s*(\d+(?:\.\d+)?)\s*(k|m|million|ribu)?/i
  );
  if (!match) return undefined;
  let value = Number(match[1]);
  const suffix = (match[2] || "").toLowerCase();
  if (suffix === "k" || suffix === "ribu") value *= 1000;
  if (suffix === "m" || suffix === "million" || suffix === "juta") value *= 1000000;
  return value;
}

function bedroomsFromText(text: string): number | undefined {
  const m = text.match(/(\d+)\s*-?\s*(?:bed|bedroom|bilik|br)/i);
  if (m) return Number(m[1]);
  return undefined;
}

function propertyTypeFromText(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes("condo") || lower.includes("kondominium")) return "Condominium";
  if (lower.includes("terrace") || lower.includes("rumah") || lower.includes("link")) return "Terrace house";
  if (lower.includes("loft")) return "Loft";
  if (lower.includes("apartment")) return "Apartment";
  return undefined;
}

function areasFromText(text: string): string[] {
  const found: string[] = [];
  for (const area of AREAS) {
    if (text.toLowerCase().includes(area.toLowerCase())) found.push(area);
  }
  return found;
}

function financingFromText(text: string): Qualification["financing"] | undefined {
  const lower = text.toLowerCase();
  if (lower.includes("approved") || lower.includes("pre-approved") || lower.includes("lulus")) return "approved";
  if (lower.includes("cash") || lower.includes("tunai")) return "cash";
  return undefined;
}

function timelineFromText(text: string): { timeline?: string; timelineDays?: number } | undefined {
  const lower = text.toLowerCase();
  const m = text.match(/(?:within|dalam)\s*(\d+)\s*(months|month|bulan|weeks|week|minggu)/i);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    const days = unit.startsWith("month") || unit === "bulan" ? n * 30 : n * 7;
    return { timeline: `Within ${n} ${unit}`, timelineDays: days };
  }
  if (lower.includes("flexible") || lower.includes("segera")) return { timeline: "Flexible", timelineDays: 180 };
  if (lower.includes("2 months") || lower.includes("dua bulan")) return { timeline: "Within 2 months", timelineDays: 60 };
  if (lower.includes("3 months") || lower.includes("tiga bulan")) return { timeline: "Within 3 months", timelineDays: 90 };
  return undefined;
}

function updateQualification(q: Qualification, message: string): Qualification {
  const budget = budgetFromText(message);
  const beds = bedroomsFromText(message);
  const prop = propertyTypeFromText(message);
  const areas = areasFromText(message);
  const fin = financingFromText(message);
  const tl = timelineFromText(message);

  const next: Qualification = { ...q };
  if (budget != null && (q.budgetMax == null || budget > (q.budgetMax || 0))) {
    next.budgetMax = budget;
    next.budgetLabel = `Up to RM${budget.toLocaleString()}`;
    next.budgetMin = q.budgetMin;
  }
  if (beds != null) next.bedrooms = beds;
  if (prop) next.propertyType = prop;
  if (areas.length) {
    next.preferredAreas = [...new Set([...(q.preferredAreas || []), ...areas])];
    next.location = next.preferredAreas.join(" / ");
  }
  if (fin) next.financing = fin;
  if (tl) {
    next.timeline = tl.timeline;
    next.timelineDays = tl.timelineDays;
  }
  return next;
}

function findListingByName(name: string): Listing | null {
  const lower = name.toLowerCase();
  return listings.find((l) => l.name.toLowerCase().includes(lower) || lower.includes(l.name.toLowerCase())) || null;
}

function findSlotByText(text: string): ViewingSlot | null {
  const lower = text.toLowerCase();
  const slots = getViewingSlots();
  if (lower.includes("tomorrow")) return slots[0];
  if (lower.includes("wednesday")) return slots[1];
  if (lower.includes("thursday")) return slots[2];
  return null;
}

function matchingListings(q: Qualification): Listing[] {
  if (
    q.preferredAreas?.includes("KLCC") &&
    q.preferredAreas?.includes("Bukit Bintang") &&
    q.bedrooms === 3 &&
    q.budgetMax && q.budgetMax <= 850000
  ) {
    return [
      listings.find((l) => l.id === "klcc-residences-3br")!,
      listings.find((l) => l.id === "bukit-bintang-suite-3br")!,
    ];
  }
  return listings.filter((l) => {
    if (l.status && l.status !== "available") return false;
    if (q.budgetMax && l.price > q.budgetMax) return false;
    if (q.bedrooms != null && (l.bedrooms ?? l.beds) !== q.bedrooms) return false;
    if (q.preferredAreas?.length && !q.preferredAreas.some((a) => l.location.toLowerCase().includes(a.toLowerCase()))) return false;
    return true;
  });
}

export async function runDemoAgent(req: AgentChatRequest): Promise<AgentResponse> {
  const { sessionId, leadId, leadName = "there", channel = "whatsapp", message, qualification = {}, conversation = [] } = req;
  const lower = message.toLowerCase();

  // Keyword guards first.
  if (lower.includes("human agent") || lower.includes("ejen manusia") || lower.includes("human") || lower.includes("agent")) {
    if (lower.includes("call") || lower.includes("phone")) {
      // User said "CALL" then "human agent"; final handoff.
    }
    return {
      message:
        "Of course. I’m Sara — I’ve flagged this conversation for a human property consultant. They will continue from here shortly.",
      sessionId,
      leadId,
      conversationStatus: "human_handling",
      handoffRequired: true,
      actions: ["handoff"],
      rulesApplied: RULES.filter((r) => r.title.includes("availability")).concat([
        { id: "rule-6", title: "Stop autonomous qualification when human is requested", priority: "high" },
      ]),
      sourcesUsed: [{ id: "ks-4", name: "Viewing_and_Handoff_SOP.pdf", category: "policy" }],
      nextBestAction: "Assign a human agent and review the handoff notes.",
    };
  }

  if (lower === "call" || (lower.includes("call") && !lower.includes("recall") && !lower.includes("called"))) {
    return {
      message:
        "Sure — I can arrange a quick call to answer questions about your selection. Would you prefer PropertyLah AI or a human property consultant?",
      sessionId,
      leadId,
      actions: ["call_request"],
      rulesApplied: RULES,
      sourcesUsed: SOURCES,
      nextBestAction: "Confirm call preference and schedule a convenient time.",
    };
  }

  if (lower.includes("loan") || lower.includes("guarantee") || lower.includes("lulus pinjaman") || lower.includes("kelulusan pinjaman")) {
    return {
      message:
        "I can’t guarantee loan approval. Approval depends on your bank and financial profile. I can arrange a human-agent follow-up or share general preparation steps.",
      sessionId,
      leadId,
      actions: ["knowledge_lookup"],
      rulesApplied: [
        { id: "rule-2", title: "Do not guarantee financial or legal outcomes", priority: "high" },
        { id: "rule-3", title: "Escalate regulated questions to a human", priority: "high" },
      ],
      sourcesUsed: [{ id: "ks-3", name: "Buyer_FAQ_EN_BM.md", category: "faq" }],
      handoffRequired: true,
      nextBestAction: "Offer a mortgage specialist follow-up.",
    };
  }

  if (
    lower.includes("legal") ||
    lower.includes("tax") ||
    lower.includes("contract") ||
    lower.includes("deposit") ||
    lower.includes("lawyer")
  ) {
    return {
      message:
        "For legal, tax, contract or deposit questions, I can only share general guidance. I can also connect you with a human property consultant for advice specific to your situation.",
      sessionId,
      leadId,
      actions: ["knowledge_lookup", "handoff"],
      rulesApplied: [
        { id: "rule-2", title: "Do not guarantee financial or legal outcomes", priority: "high" },
        { id: "rule-3", title: "Escalate regulated questions to a human", priority: "high" },
      ],
      sourcesUsed: [{ id: "ks-3", name: "Buyer_FAQ_EN_BM.md", category: "faq" }],
      handoffRequired: true,
      nextBestAction: "Assign to a human consultant for regulated advice.",
    };
  }

  // Bahasa Melayu opener
  if (lower.includes("saya cari") || lower.includes("cari") || lower.includes("bajet")) {
    const q = updateQualification(qualification, message);
    return {
      message:
        "Hai, saya Sara dari PropertyLah AI! Boleh. Berapakah bajet anda, dan adakah anda sudah mendapat kelulusan pinjaman? Saya juga boleh cadangkan unit dan aturkan sesi lawatan.",
      sessionId,
      leadId,
      qualification: q,
      leadScore: calculateLeadScore(q),
      leadStatus: calculateLeadScore(q) >= 80 ? "qualified" : "new",
      actions: ["qualification"],
      rulesApplied: RULES,
      sourcesUsed: SOURCES,
      nextBestAction: "Capture budget, financing and preferred area.",
    };
  }

  // Facility / price knowledge lookup
  if (
    lower.includes("pool") ||
    lower.includes("price") ||
    lower.includes("facility") ||
    lower.includes("security")
  ) {
    const answer = await searchKnowledge(message);
    return {
      message: answer.answer,
      sessionId,
      leadId,
      actions: ["knowledge_lookup"],
      rulesApplied: answer.rulesApplied,
      sourcesUsed: answer.sourcesUsed,
      handoffRequired: answer.handoffRequired,
      nextBestAction: answer.handoffRequired
        ? "Assign a human consultant."
        : "Ask if the customer wants to book a viewing.",
    };
  }

  // Update qualification from the latest message
  const q = updateQualification(qualification, message);

  // Slot selection / booking by text (fallback if UI not used)
  if (q.preferredAreas?.length && q.budgetMax && q.bedrooms && (lower.includes("tomorrow") || lower.includes("wednesday") || lower.includes("thursday"))) {
    // Try to detect selected listing from previous conversation or message
    let selectedId = "";
    for (let i = conversation.length - 1; i >= 0; i--) {
      const l = findListingByName(conversation[i].content);
      if (l) {
        selectedId = l.id;
        break;
      }
    }
    if (!selectedId) selectedId = "klcc-residences-3br";
    const listing = findListingByName(selectedId) || listings[0];
    const slot = findSlotByText(message) || getViewingSlots()[0];
    const channelName = channel === "telegram" ? "Telegram" : channel === "web" ? "the web" : "WhatsApp";
    const viewing: Viewing = {
      bookingId: `bkg-${Date.now()}`,
      id: `bkg-${Date.now()}`,
      confirmed: true,
      appointmentAt: slot.appointmentAt,
      startAt: slot.appointmentAt,
      leadId: leadId || sessionId,
      listingId: listing.id,
      slotId: slot.id,
      listing,
      slot,
      channel: channel as Channel,
      status: "confirmed",
    };
    const score = calculateLeadScore(q);
    return {
      message: `✅ Viewing confirmed for ${listing.name} ${slot.label.toLowerCase()}. I’ve sent the confirmation and calendar details here on ${channelName}.`,
      sessionId,
      leadId,
      qualification: q,
      viewing,
      leadScore: score,
      leadStatus: "booked",
      conversationStatus: "ai_handling",
      actions: ["booking"],
      rulesApplied: RULES,
      sourcesUsed: SOURCES,
      nextBestAction:
        "Send the property brochure before the viewing and offer a follow-up call.",
    };
  }

  // Listing selection
  const likedListing = findListingByName(message);
  if (likedListing || lower.includes("like") || lower.includes("interested") || lower.includes("view")) {
    const selected = likedListing || matchingListings(q)[0];
    if (selected) {
      return {
        message:
          "Excellent choice. I can arrange a viewing with the listing agent. Which time works best for you?",
        sessionId,
        leadId,
        qualification: q,
        suggestedSlots: getViewingSlots(),
        leadScore: calculateLeadScore(q),
        leadStatus: calculateLeadScore(q) >= 80 ? "qualified" : "new",
        actions: ["booking"],
        rulesApplied: RULES,
        sourcesUsed: SOURCES,
        nextBestAction: "Prompt the customer to select a viewing slot.",
      };
    }
  }

  // Ready to match listings
  if (q.budgetMax && q.bedrooms && (q.preferredAreas?.length || q.propertyType)) {
    const matches = matchingListings(q);
    if (matches.length) {
      const score = calculateLeadScore(q);
      const status = score >= 80 ? "qualified" : "new";
      const name = leadName.includes(" ") ? leadName.split(" ")[0] : leadName;
      return {
        message:
          matches.length === 1
            ? `Thanks, ${name}. I found one ${q.bedrooms}-bedroom ${q.propertyType || "property"} that matches your budget, preferred areas, and timeline.`
            : `Thanks, ${name}. I found ${matches.length} ${q.bedrooms}-bedroom ${q.propertyType || "properties"} that match your budget, preferred areas, and timeline.`,
        sessionId,
        leadId,
        qualification: q,
        listings: matches,
        leadScore: score,
        leadStatus: status,
        actions: ["qualification", "listing_match"],
        rulesApplied: RULES,
        sourcesUsed: SOURCES,
        nextBestAction: score >= 80
          ? "Offer a viewing slot for a high-intent lead."
          : "Ask a follow-up qualification question.",
      };
    }
  }

  // Stage-based qualification questions
  if (!q.budgetMax) {
    return {
      message: `Hi ${leadName.includes(" ") ? leadName.split(" ")[0] : leadName} 👋 I’m Sara from PropertyLah AI. I can help with that. What’s your budget, and how many bedrooms are you looking for?`,
      sessionId,
      leadId,
      qualification: q,
      actions: ["qualification"],
      rulesApplied: RULES,
      sourcesUsed: SOURCES,
      nextBestAction: "Capture budget and bedroom count.",
    };
  }

  if (!q.financing) {
    return {
      message: "Thanks. Are you already pre-approved for financing, or would you be buying with cash?",
      sessionId,
      leadId,
      qualification: q,
      actions: ["qualification"],
      rulesApplied: RULES,
      sourcesUsed: SOURCES,
      nextBestAction: "Capture financing status.",
    };
  }

  if (!q.preferredAreas?.length) {
    return {
      message: "Got it. Which areas are you most interested in — for example KLCC, Bukit Bintang, or Mont Kiara?",
      sessionId,
      leadId,
      qualification: q,
      actions: ["qualification"],
      rulesApplied: RULES,
      sourcesUsed: SOURCES,
      nextBestAction: "Capture preferred areas.",
    };
  }

  if (q.timeline == null) {
    return {
      message: "And when are you hoping to move?",
      sessionId,
      leadId,
      qualification: q,
      actions: ["qualification"],
      rulesApplied: RULES,
      sourcesUsed: SOURCES,
      nextBestAction: "Capture move-in timeline.",
    };
  }

  // Fallback
  const score = calculateLeadScore(q);
  return {
    message: "Thanks — I’ll look into that and follow up with the best next steps.",
    sessionId,
    leadId,
    qualification: q,
    leadScore: score,
    leadStatus: score >= 80 ? "qualified" : "new",
    actions: ["qualification"],
    rulesApplied: RULES,
    sourcesUsed: SOURCES,
    nextBestAction: "Review qualification and offer matching listings.",
  };
}
