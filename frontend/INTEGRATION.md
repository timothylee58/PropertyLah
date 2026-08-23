# KeyNest AI — Frontend Integration Contract

This document is for the backend engineer (Person A) wiring the real API.

## Environment variables

All public env vars are read at build time in `lib/api.ts`.

```bash
NEXT_PUBLIC_DEMO_MODE=true        # set to false to call live backend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

When `NEXT_PUBLIC_DEMO_MODE` is `true`, the frontend uses the deterministic mock engine in `lib/demo-agent.ts` and the seeded data in `lib/mock-data.ts`.

When set to `false`, the frontend calls the backend at `NEXT_PUBLIC_API_BASE_URL`.

## Expected endpoints

All live endpoints are called from `lib/api.ts`.

### 1. `POST /api/chat`

**Request**

```json
{
  "sessionId": "string",
  "leadId?": "string",
  "message": "string"
}
```

**Response**

```json
{
  "message": "string",
  "leadId?": "string",
  "qualification?": {
    "budgetMin?": number,
    "budgetMax?": number,
    "location?": "string",
    "financing?": boolean,
    "propertyType?": "string",
    "bedrooms?": number,
    "timelineDays?": number
  },
  "listings?": [ ... ],
  "suggestedSlots?": [ ... ],
  "leadScore?": number,
  "status?": "new" | "qualified" | "booked" | "cold",
  "booking?": {
    "bookingId": "string",
    "confirmed": boolean,
    "appointmentAt": "ISO-8601",
    "leadId": "string",
    "listingId": "string",
    "slotId": "string",
    "listing": { ... },
    "slot": { ... }
  }
}
```

### 2. `GET /api/leads`

Return an array of `Lead` objects. Used on `/dashboard`.

### 3. `GET /api/leads/:id`

Return a single `Lead` object. Used on `/leads/[id]`.

### 4. `POST /api/viewings`

**Request**

```json
{
  "leadId": "string",
  "listingId": "string",
  "slotId": "string"
}
```

**Response**

```json
{
  "bookingId": "string",
  "confirmed": boolean,
  "appointmentAt": "ISO-8601"
}
```

## Types

The canonical types live in `lib/types.ts`:

- `Lead`
- `Listing`
- `ViewingSlot`
- `Viewing`
- `ConversationMessage`
- `LeadStatus`
- `ChatRequest` / `ChatResponse`
- `BookingRequest` / `BookingResponse`

## Backend events the frontend depends on

1. **Chat response** — `POST /api/chat` must return the agent reply and any `listings` / `suggestedSlots` / `booking` / `qualification` updates.
2. **Lead profile updates** — the frontend passes the latest `qualification`, `leadScore`, and `status` in the chat response and uses them to update the right-side profile.
3. **Listing matches** — when a user is ready to view, the chat response should include `listings`.
4. **Slot retrieval** — after the user selects a listing, the next chat response should include `suggestedSlots`.
5. **Booking confirmation** — after the user picks a slot, the chat response should include a `booking` object. The frontend will then update the CRM via `updateLead`.

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
