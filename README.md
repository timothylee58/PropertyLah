# KeyNest AI — WhatsApp-first Property Concierge

A Next.js operations and monitoring platform for Malaysian real-estate agencies. The website is the internal agent control center for a WhatsApp-first AI property concierge that qualifies leads, recommends listings, books viewings, and escalates to AI or human calls.

Built for the Devin × Claw Collective × Qwen "AI for a Better Malaysia" hackathon.

## Demo

- `/` — Command Center / Overview
- `/inbox` — WhatsApp Inbox Monitor
- `/leads` — Lead CRM
- `/leads/:id` — Lead Detail & Conversation Intelligence
- `/viewings` — Viewing Calendar / Bookings
- `/settings` — Channel & Agent Settings

The frontend ships with a deterministic demo mode (no backend required). Set `NEXT_PUBLIC_DEMO_MODE=true` to simulate WhatsApp conversations, listing matches, bookings, and AI call requests.

## Tri-tool integration
- **Qwen** — conversation brain (`backend/app/agents/qualification.py`), BM/English/Manglish
- **OpenClaw** — live listing verification (`backend/app/agents/openclaw_tools.py`)
- **NAPIC open data** — transacted comps (`backend/app/services/comps_service.py`)
- **Devin** — used to build out the CRUD/webhook backend in parallel during the sprint

## Setup

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # fill in real keys
uvicorn app.main:app --reload
```

Run the tests with `pip install -r requirements-dev.txt && pytest`.

### Supabase
Run `supabase/schema.sql` in the Supabase SQL editor for your project. If the
original schema is already applied, run `supabase/migrations/001_booking_and_idempotency.sql`
instead — `schema.sql` is `create table if not exists`, so it won't add the new
columns to an existing project.

### Cal.com booking
1. Create an API key (Settings → Developer → API keys) and a viewing event type.
2. Put the key in `CAL_API_KEY` and the event type's numeric id in `CAL_EVENT_TYPE_ID`.
3. Set `CAL_FALLBACK_ATTENDEE_EMAIL` — Cal.com requires an attendee email and
   phone callers rarely give one.
4. `CAL_TIMEZONE` (default `Asia/Kuala_Lumpur`) is what the agent reads out loud;
   slot `start` values crossing the wire are always UTC.

Smoke test without a phone call:
```bash
curl localhost:8000/calendar/slots
curl -X POST localhost:8000/calendar/book -H 'content-type: application/json' \
  -d '{"preferred_datetime":"2026-09-01T02:00:00Z","caller_name":"Test"}'
```

### Market comps (NAPIC)
Price questions are answered from 26,365 real Kuala Lumpur transactions
(Jan 2021 – Mar 2026) published by NAPIC, not from a scrape or the model's memory,
so a mid-call `get_comps` is a local dictionary hit with nothing to time out.

`backend/app/data/comps_index.json` is committed and needs no setup. Rebuild it
when NAPIC publishes a newer quarter:
```bash
cd backend
python scripts/build_comps_index.py ~/Downloads/Open_Transaction_Data.csv
```

The same lookup is exposed for the dashboard and manual checks:
```bash
curl 'localhost:8000/market/comps?area=TTDI&property_type=terraced'
curl 'localhost:8000/market/comps?area=KLCC&budget_range=RM1.5m'
```

Matching is deliberately forgiving, because callers and NAPIC never agree on a
name: `TMN`/`Taman`, acronyms (`TTDI`), typos, and `KLCC` (which NAPIC files under
`Kuala Lumpur Town Centre`) all resolve. An area with no data returns no comps and
an instruction not to estimate — the agent never invents a price.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app starts in **demo mode** via `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local`.

To switch to the live backend:

```bash
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Then restart the dev server.

To deploy to Vercel:

```bash
npm run build
```

## Demo flow for judges

1. Open `/` to see the live overview, activity feed, and pipeline.
2. Open `/inbox` and click **Aisha Rahman**.
3. View the complete WhatsApp conversation with inline listing cards and a confirmed viewing.
4. Inspect the right-side **AI Lead Intelligence** panel with score, qualification, summary, and next best action.
5. Click **Request AI Call** to see a call status update and timeline event.
6. Open `/leads` to see the searchable/filterable CRM.
7. Click a lead row to open `/leads/:id` for full transcript, timeline, and controls.
8. Open `/viewings` to see WhatsApp-originated booking records.

## Integration notes for Person A

The frontend expects a normalized API as described in `frontend/INTEGRATION.md`. Key integration points:

- `GET /api/overview` — metrics, activity feed, pipeline, viewings
- `GET /api/leads` — CRM lead list
- `GET /api/leads/:id` — lead detail, conversation, timeline
- `POST /api/conversations/:id/messages` — incoming WhatsApp / simulated message
- `POST /api/conversations/:id/takeover` — human take-over
- `POST /api/calls` — AI call request
- `GET /api/viewings` — viewing records
- WhatsApp Business Platform webhooks → Hermes/Qwen → Supabase → normalized state

## Honest limitations

- The current demo simulates WhatsApp messages and AI call requests.
- Production requires WhatsApp Business Platform webhooks, a telephony/voice provider, and the backend in `backend/`.
- No real customer phone numbers or PII are stored in demo mode.

### Vapi
1. Create an assistant in the Vapi dashboard, or POST `voice-config/vapi_assistant.json`
   to their API.
2. Replace `YOUR-RAILWAY-BACKEND-URL` in that file with your deployed backend URL
   once Railway gives you one.
3. Set `serverUrlSecret` to match `VAPI_WEBHOOK_SECRET` in `.env`. The webhook
   rejects anything that carries neither a matching `X-Vapi-Secret` nor a valid
   `X-Vapi-Signature` HMAC of the raw body; set `VAPI_VERIFY_WEBHOOK=false` for
   local `curl` testing only.

## Voice tool flow
`get_comps` answers price questions from the NAPIC index (see above).
`get_available_slots` → agent reads the returned `label`s → `book_appointment`
with the chosen slot's exact `start`. Bookings are keyed on the Vapi call id, so
a retried tool call returns the existing booking instead of double-booking, and
the end-of-call report links its `call_logs` row to the lead from the same call.
Every calendar failure returns an `instruction` telling the agent to offer a
human callback rather than inventing a time.

## Demo checkpoint (decide by ~12:30 on the day)
If a real phone number isn't provisioned and tested, switch to Vapi's
browser/WebRTC demo mode instead of a live PSTN call — a working browser
demo beats a flaky live call in front of judges.

## Known stubs to fill in during the sprint
- `openclaw_tools.py` — endpoint/schema is a guess, adjust to whatever
  OpenClaw hands out on the day
- `vapi_assistant.json` — voice ID, backend URLs
