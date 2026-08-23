import { NextRequest, NextResponse } from "next/server";
import * as store from "@/lib/server/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const leads = await store.getLeads();
    return NextResponse.json(leads);
  } catch (err) {
    console.error("/api/leads error:", err);
    return NextResponse.json([], { status: 500 });
  }
}
