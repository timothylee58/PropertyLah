# KeyNest AI — Backend & Channel Integration Contract

This document describes the Next.js API routes and integration points for the real AI agent, Hermes/Qwen, Supabase CRM, WhatsApp webhooks, and optional calendar/voice providers.

## Product model

- Customers communicate primarily through **WhatsApp**.
- The website is an **internal operations dashboard** for agency staff.
- The backend (same-origin Next.js API routes) is the source of truth for leads, conversations, viewings, and call requests.
- The frontend falls back to a deterministic **demo mode** when `NEXT_PUBLIC_DEMO_MODE=true`.

## Environment variables

Public env vars are read at build time. Server-only secrets are read at runtime in Next.js route handlers.

```bash
# Public (build-time)
NEXT_PUBLIC_DEMO_MODE=true        # set to false for live mode
NEXT_PUBLIC_API_BASE_URL=         # optional fallback for external backend

# Server-only (never NEXT_PUBLIC_)
QWEN_API_KEY=
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
HERMES_API_URL=
HERMES_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

When `NEXT_PUBLIC_DEMO_MODE` is `true`, the frontend uses mock data and `localStorage`. When `false`, the frontend calls the same-origin `/api/*` routes (or the URL in `NEXT_PUBLIC_API_BASE_URL` if one is set).

## API routes

All routes are implemented as Next.js App Router route handlers under `frontend/app/api/`.

### 1. `GET /api/health`

Returns mode and provider configuration status without exposing secrets.

```json
{
  "ok": true,
  "mode": "demo" | "live",
  "qwenConfigured": false,
  "hermesConfigured": false,
  "supabaseConfigured": false
}
```

### 2. `POST /api/agent/chat`

Main agent endpoint. Accepts a customer message and returns a structured agent response.

**Request**

```json
{
  "sessionId": "aisha-rahman",
  "leadId": "aisha-rahman",
  "leadName": "Aisha Rahman",
  "channel": "whatsapp",
  "message": "Hi, I’m looking for a 3-bedroom condo near KLCC...",
  "conversation": [...],
  "qualification": {...}
}
```

**Response**

```json
{
  "message": "Thanks...",
  "sessionId": "aisha-rahman",
  "leadId": "aisha-rahman",
  "qualification": {...},
  "leadScore": 85,
  "leadStatus": "qualified",
  "conversationStatus": "ai_handling",
  "listings": [...],
  "suggestedSlots": [...],
  "viewing": {...},
  "sourcesUsed": [{"id": "ks-2", "name": "Listings_August_2026.csv", "category": "inventory"}],
  "rulesApplied": [{"id": "rule-1", "title": "Do not guarantee availability", "priority": "high"}],
  "actions": ["qualification", "listing_match"],
  "nextBestAction": "...",
  "handoffRequired": false
}
```

In live mode the route calls Qwen (or Hermes) with tool definitions and returns an honest 503 error if the provider is not configured.

### 3. `POST /api/listings/search`

Search the approved inventory.

### 4. `GET /api/viewings`

List viewings.

### 5. `POST /api/viewings`

Create a viewing and update the lead.

**Request**

```json
{
  "leadId": "aisha-rahman",
  "listingId": "klcc-residences-3br",
  "slotId": "slot-tomorrow-15",
  "channel": "whatsapp"
}
```

### 6. `GET /api/viewings/slots`

Return available viewing slots.

### 7. `GET /api/leads`

Return an array of `Lead` objects. Used on `/leads`.

### 8. `GET /api/leads/:id`

Return a single `Lead` with conversation and timeline.

### 9. `PATCH /api/leads/:id`

Update a lead record.

### 10. `POST /api/leads/:id/call-request`

Record an AI or human call request and update `callStatus`.

### 11. Knowledge

- `GET /api/knowledge/sources`
- `POST /api/knowledge/sources` (multipart/form-data)
- `PATCH /api/knowledge/sources/:id`
- `DELETE /api/knowledge/sources/:id`
- `POST /api/knowledge/test`

### 12. Agent rules

- `GET /api/agent/rules`
- `POST /api/agent/rules`
- `PATCH /api/agent/rules/:id`
- `DELETE /api/agent/rules/:id`

## WhatsApp webhook

Incoming WhatsApp Business Platform messages should be normalized into `AgentChatRequest` objects and sent to `POST /api/agent/chat`. The response `message` can be sent back to the customer and also stored in the CRM.

## Calendar booking

When a viewing is confirmed, `POST /api/viewings` creates a CRM record. To create a real calendar event, configure a Google Calendar service account or Cal.com integration and extend `createViewing` logic accordingly.

## Canonical types

All types live in `lib/types.ts`:

- `Lead`
- `Listing`
- `ViewingSlot` / `Viewing`
- `ConversationMessage`
- `TimelineEvent`
- `AgentResponse`
- `AgentChatRequest`
- `BookingRequest` / `BookingResponse`
- `LeadStatus` = `new` | `qualified` | `booked` | `nurture`
- `ConversationStatus` = `ai_handling` | `human_handling` | `closed`
- `CallStatus` = `not_requested` | `requested` | `scheduled` | `completed`
- `Channel` = `whatsapp` | `web` | `phone`

## Switching modes

```bash
# Demo
NEXT_PUBLIC_DEMO_MODE=true

# Live
NEXT_PUBLIC_DEMO_MODE=false
QWEN_API_KEY=<key>
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
```

Then rebuild/redeploy:

```bash
npm run build
```

## Notes

- The frontend does not require authentication.
- Do not expose secret keys in `NEXT_PUBLIC_` variables; those are embedded in the client bundle.
- In live mode, failures return honest HTTP errors and do **not** silently fall back to mock data.
- Phone numbers are masked in demo mode (`+60 12-**** 4821`); production should mask PII in the dashboard.
