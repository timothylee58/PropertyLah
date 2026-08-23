# KeyNest AI — Project Notes for Agents

## Frontend

- **Framework:** Next.js 16.3.2 (App Router), React 19, TypeScript, Tailwind CSS.
- **Package manager:** npm (`package-lock.json` present).
- **Standard commands:**
  - `npm install`
  - `npm run dev` (port 3000)
  - `npm run build`
  - `npm run start`
  - `npm run typecheck` (`tsc --noEmit`)
  - `npm run lint` (`eslint . --ext .js,.jsx,.ts,.tsx`)
- **Build output:** `next.config.mjs` uses `images: { unoptimized: true }` for simple static/Vercel deployment.

## Environment variables

Create `frontend/.env.local` (never commit it):

```bash
# Public (build-time)
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_API_BASE_URL=

# Server-only (not exposed to the browser)
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

- `NEXT_PUBLIC_DEMO_MODE=true` forces demo data and simulated agent responses.
- `NEXT_PUBLIC_DEMO_MODE=false` switches to the live Next.js server routes.
- `QWEN_*` and `HERMES_*` are server-only and must never use the `NEXT_PUBLIC_` prefix.
- Example without real values is in `frontend/.env.example`.

## Demo mode

- Demo state is kept in `localStorage` for leads, viewings, knowledge sources, and rules.
- Seed data is in `frontend/lib/mock-data.ts`.
- The deterministic demo agent is in `frontend/lib/server/demo-agent.ts` and is served by `POST /api/agent/chat`.
- Simulated WhatsApp, calls, and document indexing are labelled as simulated in the UI and logs.

## Live mode

- `NEXT_PUBLIC_DEMO_MODE=false` makes the UI call the same-origin Next.js routes below.
- `POST /api/agent/chat` uses `lib/server/live-agent.ts`:
  - If `HERMES_API_URL` is set, it proxies the request to Hermes.
  - Otherwise it calls Qwen directly with function-calling tools.
- Qwen credentials are read server-side only (no `NEXT_PUBLIC_` prefix).
- If Qwen or Hermes is not configured, `/api/agent/chat` returns HTTP 503 with an honest error. It never silently returns demo content.
- Supabase persistence is optional. If configured, run `supabase/keynest_schema.sql` before using live mode.

## API routes

Same-origin Next.js App Router routes (all in `frontend/app/api/`):

- `GET /api/health` — mode and provider configuration status.
- `POST /api/agent/chat` — agent response with listings, slots, bookings, and audit data.
- `POST /api/listings/search` — search seeded/approved inventory.
- `GET /api/viewings` — list viewings.
- `POST /api/viewings` — create a viewing and update the lead.
- `GET /api/viewings/slots` — available viewing slots.
- `GET /api/leads` — list leads.
- `GET /api/leads/:id` — lead detail.
- `PATCH /api/leads/:id` — update a lead.
- `POST /api/leads/:id/call-request` — record an AI or human call request.
- `GET /api/knowledge/sources` and `POST /api/knowledge/sources` — knowledge source list/upload.
- `PATCH /api/knowledge/sources/:id` and `DELETE /api/knowledge/sources/:id` — update/delete.
- `GET /api/agent/rules` and `POST /api/agent/rules` — agent rule list/create.
- `PATCH /api/agent/rules/:id` and `DELETE /api/agent/rules/:id` — update/delete.
- `POST /api/knowledge/test` — knowledge-base test query.

## Voice / WhatsApp

- Demo mode does not send real WhatsApp messages or place real calls.
- WhatsApp/voice provider tokens must be server-only and are not activated automatically.
- Vapi configuration stub is in `voice-config/vapi_assistant.json`.

## Verification

- `npm run typecheck` and `npm run build` must pass.
- `GET /api/health` should report mode and configuration status.
- `NEXT_PUBLIC_DEMO_MODE=true` with no credentials should run the full Aisha demo flow end-to-end.
