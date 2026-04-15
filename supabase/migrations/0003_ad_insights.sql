-- Ad-level insights + AI conversation state for the smarter analysis
-- pipeline. Layers on top of migrations 0001/0002 without refactoring
-- the existing account-level rollup.

-- ============================================================
-- fb_ad_insights_daily — per-ad performance feeding Claude vision
-- ============================================================
create table if not exists public.fb_ad_insights_daily (
    client_id uuid not null references public.clients(id) on delete cascade,
    date date not null,
    ad_id text not null,
    adset_id text,
    campaign_id text,
    ad_name text,
    creative_id text,
    thumbnail_url text,
    headline text,
    body_text text,
    cta text,
    spend numeric(12,2) not null default 0,
    impressions bigint not null default 0,
    clicks bigint not null default 0,
    ctr numeric(6,4) not null default 0,
    cpc numeric(10,2) not null default 0,
    cpm numeric(10,2) not null default 0,
    frequency numeric(6,2) not null default 0,
    fb_reported_leads bigint not null default 0,
    raw jsonb,
    updated_at timestamptz not null default now(),
    primary key (client_id, date, ad_id)
);

-- Fast "top ads by spend in window" lookups for the analysis payload
create index if not exists fb_ad_insights_client_date_spend_idx
    on public.fb_ad_insights_daily (client_id, date desc, spend desc);

alter table public.fb_ad_insights_daily enable row level security;

create policy "authenticated full access fb_ad_insights_daily"
    on public.fb_ad_insights_daily for all to authenticated
    using (true) with check (true);

-- ============================================================
-- ai_conversations — follow-up chat state per client
-- ============================================================
create table if not exists public.ai_conversations (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid not null references public.clients(id) on delete cascade,
    messages jsonb not null default '[]'::jsonb,     -- [{role, content, ts}]
    analysis jsonb,                                   -- last DeepAnalysis
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists ai_conversations_client_updated_idx
    on public.ai_conversations (client_id, updated_at desc);

alter table public.ai_conversations enable row level security;

create policy "authenticated full access ai_conversations"
    on public.ai_conversations for all to authenticated
    using (true) with check (true);
