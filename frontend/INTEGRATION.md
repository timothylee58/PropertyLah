# KeyNest AI — Backend & Channel Integration Contract

This document is for the backend engineer (Person A) wiring the real API, Hermes/Qwen agent, Supabase CRM, WhatsApp webhooks, and calendar/voice providers.

## Product model

- Customers communicate primarily through **WhatsApp**.
- The website is an **internal operations dashboard** for agency staff.
- The backend is the source of truth for leads, conversations, viewings, and call requests.
- The frontend falls back to a deterministic **demo mode** when `NEXT_PUBLIC_DEMO_MODE=true`.

## Environment variables

All public env vars are read at build time in `lib/api.ts`.

```bash
NEXT_PUBLIC_DEMO_MODE=true        # set to false to call the live backend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

When `NEXT_PUBLIC_DEMO_MODE` is `true`, the frontend uses the mock data and simulation functions in `lib/mock-data.ts` and `lib/api.ts`.

When set to `false`, the frontend calls the backend at `NEXT_PUBLIC_API_BASE_URL`.

## Implementation status

The backend now serves the four read endpoints the dashboard fetches, adapted from
the `leads` and `call_logs` tables in `backend/app/api/routes/dashboard.py`:

| Endpoint | Status |
| --- | --- |
| `GET /api/overview` | live — counters and activity feed derived from stored leads |
| `GET /api/leads` | live |
| `GET /api/leads/:id` | live — the call transcript appears as a single `system` message |
| `GET /api/viewings` | live — from leads that have an `appointment_at` |
| `POST /api/conversations/:id/*`, `POST /api/calls`, `POST /api/viewings` | not implemented — the dashboard mutates local state only |

What the voice agent cannot supply yet, and so is absent rather than faked:

- **Listings.** There is no listings table; the agent records a
  `property_reference` string, so `Viewing.listing` is optional and the UI falls
  back to that reference.
- **Conversations.** Phone calls yield one transcript, not a message thread, and
  there is no WhatsApp channel yet — so `conversationStatus` is always `closed`
  and `recommendedListings` is never populated.
- **Qualification detail.** `budgetMax` is parsed best-effort out of the free-text
  `budget_range`; `financing`, `propertyType` and `bedrooms` are not captured.
- **`medianFirstResponse`** — no inbound-timestamp metric is recorded, so it
  renders as `—`.

Mapping notes: `lead_type` `tenant` → intent `renter`; statuses
`appointment_booked` → `booked` and `disqualified`/`scam_flagged` → `nurture`;
phone numbers are masked server-side before they reach the browser.

## Endpoint reference

The live functions live in `lib/api.ts`.

### 1. `GET /api/overview`

Returns the dashboard overview data:

```json
{
  "newLeads": 12,
  "qualifiedLeads": 8,
  "bookedViewings": 4,
  "hotLeads": 3,
  "medianFirstResponse": "< 1 min",
  "activeConversations": 8,
  "activities": [ ... ],
  "leads": [ ... ],
  "viewings": [ ... ]
}
```

### 2. `GET /api/leads`

Return an array of `Lead` objects. Used on `/leads`.

### 3. `GET /api/leads/:id`

Return a single `Lead` object with conversation and timeline. Used on `/leads/[id]`.

### 4. `POST /api/conversations/:id/messages`

Triggered when a new WhatsApp message arrives (or is simulated).

**Request**

```json
{
  "content": "Hi, I’m looking for a 3-bedroom condo near KLCC...",
  "channel": "whatsapp"
}
```

**Response**

```json
{
  "message": {
    "id": "string",
    "conversationId": "string",
    "sender": "ai",
    "channel": "whatsapp",
    "content": "...",
    "createdAt": "ISO-8601",
    "deliveryStatus": "sent",
    "metadata?": {
      "listings?": [ ... ],
      "slots?": [ ... ],
      "booking?": { ... },
      "actionType?": "qualification" | "listing_match" | "booking" | "call_request"
    }
  },
  "lead": { ... }
}
```

### 5. `POST /api/conversations/:id/takeover`

Set `conversationStatus` to `human_handling` and add a handover timeline event.

### 6. `POST /api/conversations/:id/assign`

**Request**

```json
{ "agentId": "agent-123" }
```

Set `assignedAgent` and record an assignment timeline event.

### 7. `POST /api/calls`

**Request**

```json
{
  "leadId": "string",
  "listingId?": "string"
}
```

Create an AI call request. Set `callStatus` to `requested` and add a `call_requested` timeline event.

### 8. `GET /api/viewings`

Return an array of `Viewing` objects. Used on `/viewings`.

### 9. WhatsApp webhook

Incoming WhatsApp Business Platform messages should be normalized by the backend into `ConversationMessage` objects and stored in Supabase. The backend then calls Hermes/Qwen to generate the next response, which is sent back via WhatsApp and also made available to the frontend.

### 10. Calendar booking

When a viewing is confirmed, create the calendar event and return a `Viewing` object with `confirmed: true` and `appointmentAt`.

## Canonical types

All types live in `lib/types.ts`:

- `Lead`
- `Listing`
- `ViewingSlot` / `Viewing`
- `ConversationMessage`
- `TimelineEvent`
- `LeadStatus` = `new` | `qualified` | `booked` | `nurture`
- `ConversationStatus` = `ai_handling` | `human_handling` | `closed`
- `CallStatus` = `not_requested` | `requested` | `scheduled` | `completed`
- `Channel` = `whatsapp` | `web` | `phone`

## Backend events the frontend depends on

1. **Overview feed** — fresh activity events whenever the AI qualifies a lead, matches listings, books a viewing, or a call is requested.
2. **Lead list** — normalized, filterable lead records from the CRM.
3. **Lead detail** — full conversation, qualification, timeline, and next best action.
4. **Incoming messages** — a normalized AI response returned after each customer WhatsApp message, including any `listings`, `slots`, or `booking`.
5. **Takeover / assign / call request** — immediate status updates reflected in the UI and timeline.
6. **Viewings** — a list of confirmed/pending viewings for the calendar page.

## Switching modes

```bash
# Demo
NEXT_PUBLIC_DEMO_MODE=true

# Live
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_API_BASE_URL=https://your-backend.example.com
```

Then rebuild/redeploy:

```bash
npm run build
```

## Notes

- The frontend does not require authentication.
- Do not expose secret keys in `NEXT_PUBLIC_` variables; those are embedded in the client bundle.
- If a live endpoint is unavailable, the frontend silently falls back to mock data for that call and logs a warning.
- Phone numbers are masked in demo mode (`+60 12-**** 4821`); production should mask PII in the dashboard.
