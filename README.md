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
- **OpenClaw** — live listing verification + comps (`backend/app/agents/openclaw_tools.py`)
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

### Supabase
Run `supabase/schema.sql` in the Supabase SQL editor for your project.

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
3. Set `serverUrlSecret` to match `VAPI_WEBHOOK_SECRET` in `.env`.

## Demo checkpoint (decide by ~12:30 on the day)
If a real phone number isn't provisioned and tested, switch to Vapi's
browser/WebRTC demo mode instead of a live PSTN call — a working browser
demo beats a flaky live call in front of judges.

## Known stubs to fill in during the sprint
- `openclaw_tools.py` — endpoint/schema is a guess, adjust to whatever
  OpenClaw hands out on the day
- `calendar.py` — pick Cal.com (fastest, no OAuth) or Google Calendar
  (service account) and wire real booking logic
- `vapi_assistant.json` — voice ID, backend URLs
