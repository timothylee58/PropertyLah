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
    created_at timestamptz default now()
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

-- RLS: enable before any real deploy, left open here for hackathon-speed iteration
alter table leads enable row level security;
alter table call_logs enable row level security;

create policy "service role full access leads" on leads
    for all using (true) with check (true);
create policy "service role full access call_logs" on call_logs
    for all using (true) with check (true);
