import {
  Lead,
  ConversationMessage,
  Listing,
  ViewingSlot,
  Viewing,
} from "./types";
import { listings, getViewingSlots } from "./mock-data";
import { calculateLeadScore } from "./utils";

export type DemoStep =
  | "greeting"
  | "financing"
  | "areaTimeline"
  | "listings"
  | "slots"
  | "booked"
  | "generic";

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function now() {
  return new Date().toISOString();
}

export interface DemoTurnResult {
  agentMessage: ConversationMessage;
  lead: Lead;
  step: DemoStep;
  selectedListing?: Listing | null;
}

export function processDemoMessage(
  input: string,
  lead: Lead,
  step: DemoStep,
  selectedListing?: Listing | null
): DemoTurnResult {
  const lower = input.toLowerCase();

  if (step === "greeting") {
    if (lower.includes("saya cari condo di mont kiara")) {
      return {
        agentMessage: {
          id: makeId(),
          role: "agent",
          content:
            "Hai! Boleh. Berapakah bajet anda, dan adakah anda sudah mendapat kelulusan pinjaman? Saya juga boleh cadangkan unit dan aturkan sesi lawatan.",
          createdAt: now(),
          actions: ["Replied in Bahasa Melayu"],
        },
        lead,
        step: "generic",
      };
    }

    if (
      lower.includes("sell") ||
      lower.includes("jual") ||
      lower.includes("selling") ||
      lower.includes("want to sell")
    ) {
      return {
        agentMessage: {
          id: makeId(),
          role: "agent",
          content:
            "I can help you list your property. Which area is your condo in, and what’s your expected asking price?",
          createdAt: now(),
        },
        lead,
        step: "generic",
      };
    }

    const q = {
      ...lead.qualification,
      budgetMax: 800000,
      location: "KLCC",
      propertyType: "Condo",
      bedrooms: 3,
    };
    const newLead: Lead = { ...lead, qualification: q, score: calculateLeadScore(q), status: "new" };

    return {
      agentMessage: {
        id: makeId(),
        role: "agent",
        content:
          "Great — I can help with that. Are you already pre-approved for financing, or would you be buying with cash?",
        createdAt: now(),
      },
      lead: newLead,
      step: "financing",
    };
  }

  if (step === "financing") {
    const isFinanced =
      !lower.includes("cash") &&
      (lower.includes("approved") ||
        lower.includes("loan") ||
        lower.includes("pre") ||
        lower.includes("yes"));
    const q = { ...lead.qualification, financing: isFinanced };
    const newLead: Lead = { ...lead, qualification: q, score: calculateLeadScore(q) };
    const content = isFinanced
      ? "Perfect. Which area would you prefer most: KLCC, Bukit Bintang, or Mont Kiara? And when are you hoping to move?"
      : "No problem. Which area would you prefer most: KLCC, Bukit Bintang, or Mont Kiara? And when are you hoping to move?";

    return {
      agentMessage: {
        id: makeId(),
        role: "agent",
        content,
        createdAt: now(),
      },
      lead: newLead,
      step: "areaTimeline",
    };
  }

  if (step === "areaTimeline") {
    let location = lead.qualification.location;
    if (lower.includes("klcc") && lower.includes("bukit bintang")) {
      location = "KLCC / Bukit Bintang";
    } else if (lower.includes("mont kiara")) {
      location = "Mont Kiara";
    } else if (lower.includes("bukit bintang")) {
      location = "Bukit Bintang";
    } else if (lower.includes("klcc")) {
      location = "KLCC";
    }

    let timelineDays = 90;
    if (lower.includes("2 months") || lower.includes("within 2 months")) {
      timelineDays = 60;
    } else if (lower.includes("month")) {
      timelineDays = 30;
    } else if (lower.includes("week")) {
      timelineDays = 14;
    }

    const q = { ...lead.qualification, location, timelineDays };
    const newLead: Lead = {
      ...lead,
      qualification: q,
      score: calculateLeadScore(q),
      status: "qualified",
    };

    return {
      agentMessage: {
        id: makeId(),
        role: "agent",
        content:
          "Thanks, Aisha. I found two 3-bedroom condos that fit your budget and timeline. Which one would you like to view?",
        createdAt: now(),
        listings,
        actions: ["Lead qualified", "Matched 2 listings"],
      },
      lead: newLead,
      step: "listings",
    };
  }

  if (step === "listings") {
    const listing =
      listings.find(
        (l) =>
          lower.includes(l.name.toLowerCase()) ||
          lower.includes(l.id.split("-")[0])
      ) ||
      selectedListing ||
      listings[0];

    return {
      agentMessage: {
        id: makeId(),
        role: "agent",
        content: `Excellent choice. I can arrange a viewing with the listing agent for ${listing.name}. Which time works best for you?`,
        createdAt: now(),
        slots: getViewingSlots(),
        actions: ["Listing selected"],
      },
      lead,
      step: "slots",
      selectedListing: listing,
    };
  }

  if (step === "slots") {
    const slots: ViewingSlot[] = getViewingSlots();
    const slot = slots.find((s) => input.includes(s.label)) || slots[0];
    const chosenListing = selectedListing || listings[0];

    const q = { ...lead.qualification, viewingSelected: true };
    const booking: Viewing = {
      bookingId: `bkg-${Date.now()}`,
      confirmed: true,
      appointmentAt: slot.appointmentAt,
      leadId: lead.id,
      listingId: chosenListing.id,
      slotId: slot.id,
      listing: chosenListing,
      slot,
    };

    const newLead: Lead = {
      ...lead,
      qualification: q,
      score: calculateLeadScore(q),
      status: "booked",
      bookedViewing: booking,
      recommendedListings: listings,
      lastActivity: now(),
      nextBestAction:
        "Viewing confirmed for tomorrow, 3:00 PM. Send listing brochure after viewing.",
    };

    return {
      agentMessage: {
        id: makeId(),
        role: "agent",
        content:
          "Viewing confirmed. A calendar invite and confirmation will be sent to Aisha.",
        createdAt: now(),
        booking,
        actions: ["Viewing scheduled"],
      },
      lead: newLead,
      step: "booked",
      selectedListing: chosenListing,
    };
  }

  return {
    agentMessage: {
      id: makeId(),
      role: "agent",
      content:
        "I can help you find, sell, or rent a property. Could you share your budget and preferred area?",
      createdAt: now(),
    },
    lead,
    step,
  };
}
