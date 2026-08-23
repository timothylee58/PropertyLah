# KeyNest AI — Property Agent OS

A demo-ready Next.js frontend for an AI-powered real-estate lead qualification and viewing-booking agent, localized for Malaysia. Qualifies leads, matches listings, and books viewings through a polished text-chat experience.

Built for the Devin × Claw Collective × Qwen "AI for a Better Malaysia" hackathon.

## Demo

- `/` — AI Property Concierge (chat demo)
- `/dashboard` — CRM lead dashboard
- `/leads/:id` — lead detail & conversation transcript

The frontend ships with a deterministic demo mode (no backend required). Set `NEXT_PUBLIC_DEMO_MODE=true` to run the full KLCC condo qualification and booking flow.

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

See `frontend/INTEGRATION.md` for the full API contract for Person A.

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
