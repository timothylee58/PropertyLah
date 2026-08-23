create table if not exists leads (
    id uuid primary key default gen_random_uuid(),
    caller_phone text,
    caller_name text,
    lead_type text default 'unknown',
    budget_range text,
    preferred_area text,
    timeline text,
    language text,
    qualification_score int,
    status text default 'new',
    property_reference text,
    listing_verified boolean,
    notes text,
    -- one lead per Vapi call: lets retried webhook deliveries upsert instead of duplicate
    vapi_call_id text unique,
    appointment_at timestamptz,
    booking_uid text,
    -- dashboard write actions (takeover, assign, AI-call request)
    conversation_status text default 'closed', -- 'ai_handling' | 'human_handling' | 'closed'
    assigned_agent text,
    call_status text default 'not_requested', -- 'not_requested' | 'requested' | 'scheduled' | 'completed'
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists call_logs (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid references leads(id),
    vapi_call_id text not null unique,
    direction text,
    transcript text,
    duration_seconds int,
    ended_reason text,
    consent_disclosed boolean default false,
    started_at timestamptz,
    ended_at timestamptz,
    created_at timestamptz default now()
);

create index if not exists leads_created_at_idx on leads (created_at desc);
create index if not exists call_logs_lead_id_idx on call_logs (lead_id);

-- WhatsApp-style conversation thread shown in the dashboard inbox. A voice
-- call still lands as a single system-sender transcript message (see
-- dashboard_presenter.py); this table is for the text channel.
create table if not exists messages (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references leads(id) on delete cascade,
    sender text not null, -- 'lead' | 'ai' | 'human' | 'system'
    channel text not null default 'whatsapp',
    content text not null,
    delivery_status text default 'sent',
    metadata jsonb,
    created_at timestamptz default now()
);

create index if not exists messages_lead_id_created_at_idx on messages (lead_id, created_at);

-- Approved listing inventory. The `list_listings` tool (and `verify_listing`
-- for a single named property) must only ever describe what's here — never
-- invent a listing or its price.
create table if not exists listings (
    id text primary key,
    name text not null,
    location text not null,
    price numeric not null,
    price_display text not null,
    beds int not null,
    baths int not null,
    sqft int not null,
    property_type text not null,
    description text,
    badge text,
    status text not null default 'available', -- 'available' | 'under_offer' | 'sold'
    created_at timestamptz default now()
);

create index if not exists listings_status_idx on listings (status);

-- RLS: enable before any real deploy, left open here for hackathon-speed iteration
alter table leads enable row level security;
alter table call_logs enable row level security;
alter table messages enable row level security;
alter table listings enable row level security;

create policy "service role full access leads" on leads
    for all using (true) with check (true);
create policy "service role full access call_logs" on call_logs
    for all using (true) with check (true);
create policy "service role full access messages" on messages
    for all using (true) with check (true);
create policy "service role full access listings" on listings
    for all using (true) with check (true);

-- Seed the same approved inventory the dashboard's demo data uses
-- (frontend/lib/mock-data.ts), so both surfaces describe the same properties.
insert into listings (id, name, location, price, price_display, beds, baths, sqft, property_type, description, badge, status)
values
    ('klcc-residences-3br', 'KLCC Residences', 'Jalan Sultan Ismail, Kuala Lumpur', 780000, 'RM780,000', 3, 2, 1180, 'Condominium', 'High-floor city-view unit, 8 minutes from KLCC.', 'Best Match', 'available'),
    ('bukit-bintang-suite-3br', 'Bukit Bintang Suite', 'Bukit Bintang, Kuala Lumpur', 795000, 'RM795,000', 3, 2, 1120, 'Condominium', 'Walkable to retail, dining, and transit.', 'New Listing', 'available'),
    ('verde-mont-kiara-3br', 'Verde Mont Kiara', 'Mont Kiara, Kuala Lumpur', 1180000, 'RM1,180,000', 3, 2, 1250, 'Condominium', 'Low-density residence with garden views.', 'Premium', 'available'),
    ('bangsar-urban-loft', 'Bangsar Urban Loft', 'Bangsar, Kuala Lumpur', 920000, 'RM920,000', 2, 2, 980, 'Loft', 'Converted warehouse loft near Bangsar Village.', null, 'available'),
    ('setapak-family-residence', 'Setapak Family Residence', 'Setapak, Kuala Lumpur', 650000, 'RM650,000', 4, 3, 1400, 'Terrace house', 'Corner-lot terrace close to schools and the highway.', null, 'available'),
    ('cheras-starter-condo', 'Cheras Starter Condo', 'Cheras, Kuala Lumpur', 485000, 'RM485,000', 1, 1, 650, 'Condominium', 'Entry-level unit, good rental yield area.', null, 'available'),
    ('pj-garden-terrace', 'PJ Garden Terrace', 'Petaling Jaya, Selangor', 1050000, 'RM1,050,000', 4, 3, 1550, 'Terrace house', 'Renovated kitchen, private garden.', null, 'available'),
    ('cyberjaya-smart-suite', 'Cyberjaya Smart Suite', 'Cyberjaya, Selangor', 420000, 'RM420,000', 1, 1, 620, 'Condominium', 'Smart-home fittings, tech-park adjacent.', null, 'available'),
    ('shah-alam-family-residence', 'Shah Alam Family Residence', 'Shah Alam, Selangor', 880000, 'RM880,000', 4, 3, 1450, 'Terrace house', 'Gated community, playground access.', null, 'available')
on conflict (id) do nothing;
