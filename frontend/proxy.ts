import { NextRequest, NextResponse } from "next/server";
import {
  DASHBOARD_API_KEY,
  DASHBOARD_REQUIRE_AUTH,
  IS_DEMO,
  RATE_LIMIT_ENABLED,
  RATE_LIMIT_DASHBOARD_PER_MINUTE,
  RATE_LIMIT_AGENT_PER_MINUTE,
} from "@/lib/server/env";
import { checkRateLimit } from "@/lib/server/rate-limit";

// This is the dashboard's only access-control point: every /api/* route
// (leads, viewings, knowledge sources, agent rules, the agent chat endpoint)
// carries lead PII or can mutate stored state, and none of them checked
// anything before this middleware existed — see frontend/INTEGRATION.md for
// the auth caveat (this is a shared key, not per-operator login).
export const config = {
  matcher: ["/api/:path*"],
};

// /api/health only reports config booleans (no PII) and the dashboard calls
// it to decide demo vs. live mode before it necessarily has a key configured.
const PUBLIC_PATHS = new Set(["/api/health"]);

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function providedKey(request: NextRequest): string | null {
  const header = request.headers.get("x-api-key");
  if (header) return header;
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7);
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Demo mode ships with zero credentials by design (see AGENTS.md: "NEXT_PUBLIC_DEMO_MODE=true
  // with no credentials should run the full Aisha demo flow end-to-end") — nothing behind these
  // routes is real customer data in that mode, so the shared-key gate only applies once the
  // deployment is actually running live. A deployment that enables demo mode *and* configures
  // real Supabase credentials would still skip this check; that's an existing gap in how demo
  // mode is scoped (see frontend/lib/server/store.ts), not something this gate can fix on its own.
  if (DASHBOARD_REQUIRE_AUTH && !IS_DEMO) {
    if (!DASHBOARD_API_KEY) {
      return NextResponse.json(
        { error: "DASHBOARD_API_KEY is not set — set it, or set DASHBOARD_REQUIRE_AUTH=false locally" },
        { status: 500 }
      );
    }
    if (providedKey(request) !== DASHBOARD_API_KEY) {
      return NextResponse.json({ error: "missing or invalid dashboard API key" }, { status: 401 });
    }
  }

  if (RATE_LIMIT_ENABLED) {
    const bucket = pathname.startsWith("/api/agent/chat") ? "agent" : "dashboard";
    const limit = bucket === "agent" ? RATE_LIMIT_AGENT_PER_MINUTE : RATE_LIMIT_DASHBOARD_PER_MINUTE;
    if (!checkRateLimit(bucket, clientIp(request), limit)) {
      return NextResponse.json({ error: "too many requests, slow down" }, { status: 429 });
    }
  }

  return NextResponse.next();
}
