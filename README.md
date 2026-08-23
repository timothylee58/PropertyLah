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

### Supabase
Run `supabase/schema.sql` in the Supabase SQL editor for your project.

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
