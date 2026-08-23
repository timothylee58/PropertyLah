# PropertyLah AI — Diagram Library

A single reference page of all architecture, flow, and data diagrams for pitch and technical reviews.

---

## 1. System Architecture

```mermaid
graph TB
    subgraph "Customer Channels"
        WA[WhatsApp Business]
        TG[Telegram Bot]
        WEB[Web Chat / Widget]
        PHONE[Phone / Voice]
    end

    subgraph "Frontend — Next.js 16 App Router"
        LAND["/ — Marketing landing"]
        DASH["/dashboard — Command Center"]
        INB["/inbox — Conversation monitor"]
        LEADS["/leads — CRM"]
        VIEW["/viewings — Calendar"]
        KNOW["/knowledge — Sources & rules"]
        SETT["/settings — Integration status"]
        API["/api/* — Same-origin API routes"]
    end

    subgraph "AI Agent Layer"
        DEMO[demo-agent.ts<br/>Deterministic]
        LIVE[live-agent.ts<br/>Qwen / Hermes tool loop]
        TOOLS[agent-tools.ts<br/>search / book / handoff]
    end

    subgraph "Backend — FastAPI"
        VAPI["/voice/webhook"]
        DASHAPI["/api/* — Staff dashboard"]
        CAL["/calendar/* — Cal.com slots"]
        MRKT["/market/* — NAPIC comps"]
    end

    subgraph "External Providers"
        QWEN[Qwen via DashScope]
        HERMES[Hermes API]
        SUPA[Supabase Postgres]
        CALCOM[Cal.com / Google Calendar]
        ELEVEN[ElevenLabs TTS / Calls]
        VAPIV[Vapi voice]
    end

    WA -->|webhook| API
    TG -->|webhook| API
    WEB -->|POST /api/web/chat| API
    PHONE -->|custom LLM webhook| VAPI

    API --> DEMO
    API --> LIVE
    LIVE --> QWEN
    LIVE --> HERMES
    LIVE --> TOOLS
    DEMO --> TOOLS

    API --> SUPA
    DASH --> API
    INB --> API
    LEADS --> API
    VIEW --> API
    KNOW --> API
    SETT --> API

    DASHAPI --> SUPA
    VAPI --> QWEN
    VAPI --> SUPA
    CAL --> CALCOM
    MRKT -->|NAPIC data| SUPA

    DASHAPI -.->|optional| API
    API -.->|optional| DASHAPI
```

---

## 2. Agent Chat Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant API as /api/agent/chat
    participant QW as Qwen
    participant TOOL as agent-tools.ts
    participant STORE as store.ts

    U->>API: Send message
    API->>TOOL: extractQualification()
    API->>QW: chat.completions.create(tools=TOOL_DEFINITIONS)
    loop up to 3 tool-call rounds
        QW-->>API: tool_call(s)
        API->>TOOL: executeTools()
        TOOL->>STORE: search / update / book
        STORE-->>TOOL: results
        TOOL-->>API: state + results
        API->>QW: tool results appended
    end
    QW-->>API: final assistant message
    API->>STORE: update lead / viewing / conversation
    API-->>U: AgentResponse {message, listings, slots, ...}
```

---

## 3. Demo vs Live Mode

```mermaid
flowchart TD
    ENV["process.env.NEXT_PUBLIC_DEMO_MODE"] -->|true| DEMO[Demo mode]
    ENV -->|false| LIVE[Live mode]

    DEMO -->|localStorage| SEED[Seed leads/viewings/knowledge/rules]
    DEMO -->|deterministic| DEMO_AGENT[demo-agent.ts]
    DEMO_AGENT -->|no API calls| TOOLS[agent-tools.ts / in-memory store]

    LIVE -->|same-origin API| API_ROUTES[Next.js API routes]
    API_ROUTES -->|Qwen/Hermes| LIVE_AGENT[live-agent.ts]
    API_ROUTES -->|if configured| SUPA[Supabase]
    LIVE_AGENT -->|tool loop| TOOLS
```

---

## 4. Data Model

```mermaid
erDiagram
    LEAD ||--o{ CONVERSATION_MESSAGE : has
    LEAD ||--o{ TIMELINE_EVENT : has
    LEAD ||--o{ VIEWING : books
    LEAD ||--o{ KNOWLEDGE_SOURCE : cites
    LEAD ||--o{ AGENT_RULE : follows

    LEAD {
        string id
        string name
        string phoneMasked
        string channel
        string status
        string scoreLabel
        number score
        object qualification
        array conversation
        array timelineEvents
        object bookedViewing
    }

    CONVERSATION_MESSAGE {
        string id
        string sender
        string channel
        string content
        string createdAt
        object metadata
    }

    VIEWING {
        string bookingId
        string appointmentAt
        string status
        object listing
        object slot
        string channel
    }

    KNOWLEDGE_SOURCE {
        string id
        string name
        string category
        string status
        boolean enabled
    }

    AGENT_RULE {
        string id
        string title
        string instruction
        string priority
        boolean enabled
    }
```

---

## 5. Conversation Flow

```mermaid
flowchart LR
    A[Inbound message<br/>WhatsApp/Telegram/Web/Phone] --> B{Agent understands}
    B -->|Qualify| C[Ask budget / area / timeline]
    C --> D[Update lead record]
    D --> E[Search listings]
    E --> F[Show 2-3 matches]
    F --> G[Offer viewing slots]
    G --> H[Create viewing]
    H --> I[Update CRM & calendar]
    I --> J[Notify staff dashboard]
    B -->|Knowledge| K[Search knowledge base]
    B -->|Handoff| L[Set human_handling]
    B -->|Call| M[Request AI / human call]
```

---

## 6. WhatsApp Integration Flow

```mermaid
sequenceDiagram
    participant C as Customer
    participant W as WhatsApp Business API
    participant BE as /api/agent/chat
    participant CRM as Supabase

    C->>W: Send WhatsApp message
    W->>BE: POST webhook
    BE->>CRM: upsert lead, append message
    BE->>BE: runLiveAgent()
    BE->>CRM: save AI reply
    BE->>W: Send reply
    W->>C: Deliver message
```

---

## 7. Telegram Integration Flow

```mermaid
sequenceDiagram
    participant C as Customer
    participant T as Telegram
    participant TW as /api/telegram/webhook
    participant AG as /api/agent/chat

    C->>T: Message bot
    T->>TW: Update
    TW->>AG: AgentChatRequest
    AG-->>TW: AgentResponse
    TW->>T: sendMessage
    T->>C: Reply
```

---

## 8. Voice Call Flow (Vapi)

```mermaid
sequenceDiagram
    participant C as Caller
    participant V as Vapi
    participant LLM as /voice/webhook

    C->>V: Speaks
    V->>LLM: Custom LLM call
    LLM->>LLM: Qwen with tools
    LLM-->>V: assistant response
    V->>C: Played back
```

---

## 9. Auth & Rate Limiting

```mermaid
flowchart LR
    REQ[Request] -->|/api/* except health| PROXY[proxy.ts / middleware]
    PROXY -->|IS_DEMO| BYPASS[No auth]
    PROXY -->|live| AUTH{X-Api-Key matches?}
    AUTH -->|yes| RL[Rate limiter]
    AUTH -->|no| 403[HTTP 403]
    RL -->|under limit| HANDLER[Route handler]
    RL -->|over limit| 429[HTTP 429]
```

---

## 10. Roadmap Gantt

```mermaid
gantt
    title PropertyLah AI — Delivery Roadmap
    dateFormat  YYYY-MM-DD
    section Foundation
    Demo / pitch ready           :done,    f1, 2026-08-23, 0d
    Live Qwen integration        :done,    f2, 2026-08-20, 3d
    Build & lint green           :done,    f3, 2026-08-23, 0d
    section Pilot
    Live WhatsApp Business       :active,  p1, 2026-08-24, 28d
    Supabase production setup    :         p2, 2026-08-24, 14d
    Real Cal.com bookings        :         p3, 2026-09-07, 14d
    Per-operator login (RBAC)    :         p4, 2026-09-21, 21d
    section Scale
    Team inbox                   :         s1, 2026-10-12, 14d
    Analytics & reporting        :         s2, 2026-10-26, 21d
    iProperty/PropertyGuru sync  :         s3, 2026-11-16, 28d
    Mobile app (PWA)             :         s4, 2026-12-14, 35d
```

---

## 11. Pitch Value Flow

```mermaid
graph LR
    A[Prospect sends WhatsApp] --> B[AI qualifies in BM/English]
    B --> C[Matches 2-3 listings]
    C --> D[Offers viewing slots]
    D --> E[Books viewing]
    E --> F[Updates CRM]
    F --> G[Agent sees hot lead in dashboard]
```

---

## 12. Deployment (Demo)

```mermaid
graph LR
    USER[Demo user] -->|HTTPS| VER[Vercel<br/>Next.js + API routes]
    VER -->|localStorage| DEMO[(Browser storage)]
    VER -->|AI| QW[Qwen key in Vercel env]
```

---

## 13. Deployment (Production)

```mermaid
graph LR
    USER[Prospect / Staff] -->|HTTPS| VER[Vercel<br/>Next.js frontend]
    VER -->|API calls| BE[FastAPI backend<br/>Docker / Cloud Run]
    BE -->|Persistence| SB[(Supabase)]
    VER -->|AI calls| QW[Qwen / Hermes]
    VER -->|TTS / calls| EL[ElevenLabs]
    WA[WhatsApp] -->|webhook| META[Meta WABA]
    META -->|forward| BE
    TG[Telegram] -->|webhook| TGBOT[Telegram Bot API]
    TGBOT -->|forward| VER
    VAPI[Vapi] -->|custom LLM| BE
    BE -->|slots / bookings| CAL[Cal.com / GCal]
```

---

## Notes

- All diagrams are written in Mermaid syntax and render in GitHub, GitLab, Notion, and VS Code extensions.
- For slide decks, use a Mermaid-to-PNG/SVG exporter or screenshot from a Markdown preview.
