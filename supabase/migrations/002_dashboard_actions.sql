-- Backs the dashboard's write actions (takeover, assign, AI-call request,
-- WhatsApp-style messaging) that previously only mutated frontend localStorage.
-- Run this on a project that already has schema.sql + 001 applied.

alter table leads add column if not exists conversation_status text default 'closed';
alter table leads add column if not exists assigned_agent text;
alter table leads add column if not exists call_status text default 'not_requested';
alter table leads add column if not exists updated_at timestamptz default now();

-- backfill existing rows: a voice call is over by the time it's persisted
update leads set conversation_status = 'closed' where conversation_status is null;
update leads set call_status = 'not_requested' where call_status is null;
update leads set updated_at = created_at where updated_at is null;

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

alter table messages enable row level security;
create policy "service role full access messages" on messages
    for all using (true) with check (true);
