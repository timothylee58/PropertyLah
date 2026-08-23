# KeyNest AI — WhatsApp-first Property Concierge

**KeyNest AI is a WhatsApp-first property concierge with an internal agency monitoring platform.**

It uses a server-side AI agent to handle WhatsApp inquiries, qualify leads, match approved listings, apply agency rules, cite knowledge sources, offer viewing slots, book viewings, and update the CRM — with an internal dashboard for agency staff to monitor and take over conversations.

Built for the Devin × Claw Collective × Qwen "AI for a Better Malaysia" hackathon.

## Demo

No credentials are required for the deterministic demo:

- `/` — Command Center / Overview
- `/inbox` — WhatsApp Inbox Monitor
- `/leads` — Lead CRM
- `/leads/:id` — Lead Detail & Conversation Intelligence
- `/viewings` — Viewing Calendar / Bookings
- `/knowledge` — Knowledge Sources & Agent Rules
- `/settings` — Channel & Agent Settings

The frontend ships with a deterministic demo mode (no backend required). Set `NEXT_PUBLIC_DEMO_MODE=true` to simulate WhatsApp conversations, listing matches, bookings, AI call requests, and knowledge-base tests.

## Setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app starts in **demo mode** when `NEXT_PUBLIC_DEMO_MODE=true` in `frontend/.env.local`.

### Environment

Copy `frontend/.env.example` to `frontend/.env.local` and fill in only what you need.

```bash
# Public (build-time, safe for the browser)
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_API_BASE_URL=

# Server-only (never exposed to the browser)
QWEN_API_KEY=
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
HERMES_API_URL=
HERMES_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CALENDAR_ID=
VAPI_WEBHOOK_SECRET=
```

- `QWEN_*` and `HERMES_*` are server-only. They must never use the `NEXT_PUBLIC_` prefix.
- WhatsApp, voice, and calendar tokens must also be server-only.

## Switching to live mode

Set `NEXT_PUBLIC_DEMO_MODE=false` and provide a Qwen or Hermes configuration:

```bash
NEXT_PUBLIC_DEMO_MODE=false
QWEN_API_KEY=<your-qwen-key>
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
```

Then rebuild and restart:

```bash
npm run build
npm run start
```

Verify the mode with:

```bash
curl http://localhost:3000/api/health
```

The response reports `mode`, `qwenConfigured`, `hermesConfigured`, and `supabaseConfigured` without exposing any secret values.

## Live architecture

In live mode the browser calls same-origin Next.js API routes:

- `GET /api/health` — mode and provider status
- `POST /api/agent/chat` — Hermes/Qwen agent with tool calls
- `POST /api/listings/search` — search approved inventory
- `GET /api/viewings` / `POST /api/viewings` / `GET /api/viewings/slots`
- `GET /api/leads` / `GET /api/leads/:id` / `PATCH /api/leads/:id`
- `POST /api/leads/:id/call-request`
- `GET/POST/PATCH/DELETE /api/knowledge/sources`
- `GET/POST/PATCH/DELETE /api/agent/rules`
- `POST /api/knowledge/test`

The Qwen agent (`lib/server/live-agent.ts`) uses function calling for `search_listings`, `get_viewing_slots`, `create_viewing`, `update_lead`, `search_knowledge`, `request_call`, and `handoff_to_human`. Hermes can be used instead by setting `HERMES_API_URL`.

### Supabase (optional)

For production persistence, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then run `supabase/keynest_schema.sql` in the Supabase SQL editor.

## Demo / judge click path

1. Open `/` to see the live overview, activity feed, and pipeline.
2. Open `/inbox` and click **Aisha Rahman**.
3. View the seeded WhatsApp conversation with qualification, listing cards, and a confirmed viewing.
4. Send the demo message "CALL" and click **Request AI Call** to see the call status update.
5. Type "human agent" to see the human-handoff flow.
6. Open `/leads` to see the searchable/filterable CRM.
7. Click a lead row to open `/leads/:id` for the full transcript, AI summary, timeline, source/rule audit, and controls.
8. Open `/viewings` to see WhatsApp-originated booking records.
9. Open `/knowledge`, upload a test file, and run the test queries to see source and rule audit chips.

Recommended judge state: `NEXT_PUBLIC_DEMO_MODE=true`.

## Build & verification

```bash
npm run typecheck
npm run build
```

`npm run build` is the required verification command and must pass before deployment.

## Honest limitations

- **WhatsApp:** The demo simulates WhatsApp UI and messages. Real WhatsApp Business Platform webhooks, provider credentials, and phone provisioning are required for live customer messaging.
- **AI calls:** Call requests are recorded as CRM events. Real PSTN/browser voice requires a verified Vapi or telephony provider.
- **Document indexing:** Knowledge-source uploads are stored as metadata. Real text extraction, chunking, embedding, and vector retrieval require a pipeline (Supabase + Qwen or Hermes) and are not enabled automatically.
- **Calendar:** Viewing bookings create CRM records. A real calendar event requires a Google Calendar service account or Cal.com integration.
- **Inventory:** Listings come from the seeded agency inventory. Property-portal scraping is not implemented and not planned.
- **Financial/legal advice:** The agent only provides general information and offers human handoff. It never guarantees loan approval, investment returns, rental yield, price appreciation, or legal outcomes.

## Vercel deployment

1. Set `NEXT_PUBLIC_DEMO_MODE=true` as an environment variable for the demo judge deployment.
2. Add any live provider secrets under **Settings > Environment Variables** as server-only (no `NEXT_PUBLIC_` prefix).
3. Use the build command `npm run build` and output directory `.next`.
4. Images are unoptimized (`next.config.mjs`) for simpler static/Vercel hosting.

## Engineering summary

1. **Files changed/created:**
   - `lib/types.ts` — extended agent and viewing types.
   - `lib/mock-data.ts` — expanded listings and demo seed data.
   - `lib/server/*` — env, store, score, demo-agent, live-agent (Qwen/Hermes), agent tools, knowledge, Qwen client, Supabase client.
   - `lib/api.ts` — unified demo/live API layer with LocalStorage demo state and honest live fallback.
   - `app/api/*` — Next.js API routes for health, agent, listings, viewings, leads, knowledge, rules.
   - `app/inbox/page.tsx` and `components/chat/chat-message.tsx` — listing and slot selection.
   - `frontend/.env.example`, `AGENTS.md`, `supabase/keynest_schema.sql`.

2. **Demo-mode functionality:** Full deterministic Aisha flow (qualification → two listings → slot picker → booking → Hot/Booked lead → overview updates → viewings record → knowledge test). CALL and human-handoff flows work. Bahasa Melayu response works.

3. **Live Hermes/Qwen functionality:** Verified real Qwen response via `POST /api/agent/chat` in live mode, returning a non-empty agent message and matched listings with source/rule audit chips. Missing/malformed provider configuration returns an honest 503 error instead of demo content.

4. **Live setup requirements:** `NEXT_PUBLIC_DEMO_MODE=false`, `QWEN_API_KEY`, `QWEN_BASE_URL`, `QWEN_MODEL` (or `HERMES_API_URL`). Optional `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` for persistence.

5. **Security:** All provider secrets are server-only and never exposed to the browser or logs. No service-role keys, WhatsApp tokens, or telephony credentials are sent to the client.

6. **Known remaining infrastructure:** Real WhatsApp webhooks, voice PSTN, calendar event creation, and production document indexing/RAG are still integration points requiring external providers and credentials.
