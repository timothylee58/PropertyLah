import { NextRequest, NextResponse } from "next/server";
import * as store from "@/lib/server/store";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

export async function GET(request: NextRequest) {
  try {
    const all = await store.getLeads();
    const { searchParams } = request.nextUrl;
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(searchParams.get("limit")) || DEFAULT_LIMIT)
    );
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
    const page = all.slice(offset, offset + limit);

    // header, not a body-shape change, so this stays a drop-in for existing
    // callers that treat the response as a plain Lead[]
    return NextResponse.json(page, { headers: { "X-Total-Count": String(all.length) } });
  } catch (err) {
    console.error("/api/leads error:", err);
    return NextResponse.json([], { status: 500 });
  }
}
