-- Run this on a project that already has the original schema.sql applied.
-- schema.sql uses `create table if not exists`, so it will not add these itself.

alter table leads add column if not exists vapi_call_id text;
alter table leads add column if not exists appointment_at timestamptz;
alter table leads add column if not exists booking_uid text;

create unique index if not exists leads_vapi_call_id_key on leads (vapi_call_id);
create unique index if not exists call_logs_vapi_call_id_key on call_logs (vapi_call_id);

create index if not exists leads_created_at_idx on leads (created_at desc);
create index if not exists call_logs_lead_id_idx on call_logs (lead_id);
