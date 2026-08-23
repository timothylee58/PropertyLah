import { NextRequest, NextResponse } from "next/server";
import { getSlots } from "@/lib/server/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId") || "";
    const listingId = searchParams.get("listingId") || "";
    if (!leadId || !listingId) {
      return NextResponse.json({ error: "leadId and listingId are required" }, { status: 400 });
    }
    const slots = getSlots().map((s) => ({ ...s, available: true }));
    return NextResponse.json({ slots });
  } catch (err) {
    console.error("/api/viewings/slots error:", err);
    return NextResponse.json({ slots: [] }, { status: 500 });
  }
}
