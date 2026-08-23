import { NextRequest, NextResponse } from "next/server";
import { BookingRequest } from "@/lib/types";
import * as store from "@/lib/server/store";
import { calculateLeadScore, scoreLabel } from "@/lib/server/score";

export const runtime = "nodejs";

export async function GET() {
  try {
    const viewings = await store.getViewings();
    return NextResponse.json(viewings);
  } catch (err) {
    console.error("/api/viewings error:", err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BookingRequest;
    const { leadId, listingId, slotId, channel } = body;

    if (!leadId || !listingId || !slotId) {
      return NextResponse.json(
        { error: "leadId, listingId and slotId are required" },
        { status: 400 }
      );
    }

    const listing = store.getListing(listingId);
    const slot = store.getSlot(slotId);
    const lead = await store.getLead(leadId);

    if (!listing || !slot) {
      return NextResponse.json(
        { error: "Listing or slot not found" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const bookingId = `bkg-${Date.now()}`;
    const viewing = {
      bookingId,
      id: bookingId,
      confirmed: true,
      appointmentAt: slot.appointmentAt,
      startAt: slot.appointmentAt,
      leadId,
      listingId,
      slotId,
      listing,
      slot,
      channel: channel || "whatsapp",
      status: "confirmed" as const,
    };

    await store.addViewing(viewing);

    let leadScore = 85;
    let leadStatus = "booked" as const;

    if (lead) {
      lead.bookedViewing = viewing;
      lead.status = "booked";
      lead.score = calculateLeadScore(lead.qualification);
      lead.scoreLabel = scoreLabel(lead.score);
      lead.lastActivity = now;
      lead.nextBestAction =
        "Send the property brochure before the viewing and offer a follow-up call.";
      lead.timelineEvents = lead.timelineEvents || [];
      lead.timelineEvents.unshift({
        id: `te-${Date.now()}`,
        type: "viewing_booked",
        title: `Viewing confirmed: ${slot.label}`,
        createdAt: now,
      });
      await store.updateLead(lead);
      leadScore = lead.score;
    }

    const channelName = channel === "telegram" ? "Telegram" : channel === "web" ? "the web" : "WhatsApp";
    return NextResponse.json({
      viewing,
      confirmationMessage: `✅ Viewing confirmed for ${listing.name} ${slot.label.toLowerCase()}. I’ve sent the confirmation and calendar details here on ${channelName}.`,
      leadScore,
      leadStatus,
      nextBestAction: "Send the property brochure before the viewing and offer a follow-up call.",
    });
  } catch (err) {
    console.error("/api/viewings error:", err);
    return NextResponse.json(
      { error: "Unable to create booking. Please try again or assign a human agent." },
      { status: 500 }
    );
  }
}
