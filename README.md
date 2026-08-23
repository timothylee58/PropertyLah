# Ejen — Voice AI Property Agent

24/7 voice AI for property agents/PM firms: qualifies leads, verifies listings
before discussing them, books appointments. Built for the Devin × Claw
Collective × Qwen "AI for a Better Malaysia" hackathon.

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

### Frontend
```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --eslint --app --import-alias "@/*" --yes
npx shadcn@latest init -y
npm install
npm run dev
```
(This scaffold provides `app/page.tsx`, `app/calls/[id]/page.tsx`, and
`lib/api.ts` — drop them in after `create-next-app` runs, it will prompt to
overwrite `app/page.tsx`.)

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
