import { NextRequest, NextResponse } from "next/server";
import { searchListings } from "@/lib/server/store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      location?: string;
      maxPrice?: number;
      bedrooms?: number;
      propertyType?: string;
    };
    const listings = searchListings(body);
    return NextResponse.json({ listings });
  } catch (err) {
    console.error("/api/listings/search error:", err);
    return NextResponse.json({ listings: [] }, { status: 500 });
  }
}
