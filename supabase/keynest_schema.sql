-- KeyNest AI — Next.js live-mode schema
-- Run this in the Supabase SQL editor when using live mode.

-- Drop tables only if you are recreating a fresh environment.
-- create extension if not exists "uuid-ossp";

create table if not exists keynest_leads (
    id text primary key,
    data jsonb not null default '{}'::jsonb,
    updated_at timestamptz default now()
);

create table if not exists keynest_viewings (
    id text primary key,
    data jsonb not null default '{}'::jsonb,
    updated_at timestamptz default now()
);

create table if not exists keynest_knowledge_sources (
    id text primary key,
    data jsonb not null default '{}'::jsonb,
    updated_at timestamptz default now()
);

create table if not exists keynest_agent_rules (
    id text primary key,
    data jsonb not null default '{}'::jsonb,
    updated_at timestamptz default now()
);

-- Indexes for the most common lookups.
create index if not exists keynest_leads_updated_at on keynest_leads (updated_at desc);
create index if not exists keynest_viewings_updated_at on keynest_viewings (updated_at desc);
