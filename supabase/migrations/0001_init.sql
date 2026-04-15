-- Kingsgate CEO Dashboard — initial schema
-- Tracks Facebook Ads + GHL performance for all agency clients.

create extension if not exists "uuid-ossp";
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ============================================================
-- clients: one row per agency client
-- ============================================================
create table if not exists public.clients (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    fb_ad_account_id text not null,                -- e.g. "act_1234567890"
    ghl_location_id text not null,                 -- GHL sub-account id
    target_cpl numeric(10,2),                      -- target cost per lead ($)
    target_cost_per_booking numeric(10,2),         -- target cost per booking ($)
    monthly_budget numeric(10,2),
    notes text,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists clients_active_idx on public.clients (active);

-- ============================================================
-- fb_insights_daily: raw daily Facebook Ads metrics per client
-- ============================================================
create table if not exists public.fb_insights_daily (
    client_id uuid not null references public.clients(id) on delete cascade,
    date date not null,
    spend numeric(12,2) not null default 0,
    impressions bigint not null default 0,
    clicks bigint not null default 0,
    ctr numeric(6,4) not null default 0,
    cpm numeric(10,2) not null default 0,
    cpc numeric(10,2) not null default 0,
    frequency numeric(6,2) not null default 0,
    reach bigint not null default 0,
    fb_reported_leads bigint not null default 0,   -- FB-reported lead actions
    raw jsonb,
    updated_at timestamptz not null default now(),
    primary key (client_id, date)
);

create index if not exists fb_insights_client_date_idx
    on public.fb_insights_daily (client_id, date desc);

-- ============================================================
-- ghl_events: lead/booking/show/sale events from GoHighLevel
-- ============================================================
create type ghl_event_type as enum ('lead', 'booking', 'show', 'sale');

create table if not exists public.ghl_events (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid not null references public.clients(id) on delete cascade,
    event_type ghl_event_type not null,
    contact_id text not null,                      -- GHL contact id
    occurred_at timestamptz not null,
    raw jsonb,
    created_at timestamptz not null default now(),
    unique (client_id, contact_id, event_type)
);

create index if not exists ghl_events_client_occurred_idx
    on public.ghl_events (client_id, occurred_at desc);
create index if not exists ghl_events_type_idx
    on public.ghl_events (client_id, event_type, occurred_at desc);

-- ============================================================
-- daily_kpis: rollup joining FB spend + GHL events per day
-- ============================================================
create table if not exists public.daily_kpis (
    client_id uuid not null references public.clients(id) on delete cascade,
    date date not null,
    spend numeric(12,2) not null default 0,
    leads bigint not null default 0,
    bookings bigint not null default 0,
    shows bigint not null default 0,
    sales bigint not null default 0,
    impressions bigint not null default 0,
    clicks bigint not null default 0,
    ctr numeric(6,4) not null default 0,
    frequency numeric(6,2) not null default 0,
    cost_per_lead numeric(10,2),
    cost_per_booking numeric(10,2),
    booking_rate numeric(6,4),                     -- bookings / leads
    show_rate numeric(6,4),                        -- shows / bookings
    updated_at timestamptz not null default now(),
    primary key (client_id, date)
);

create index if not exists daily_kpis_client_date_idx
    on public.daily_kpis (client_id, date desc);

-- ============================================================
-- flags: auto-detected KPI issues per client
-- ============================================================
create type flag_severity as enum ('low', 'medium', 'high');
create type flag_type as enum (
    'low_volume',           -- < 3 leads in 3 days
    'cpl_over_target',
    'cpb_over_target',
    'conversion_rate_drop',
    'ad_fatigue'
);

create table if not exists public.flags (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid not null references public.clients(id) on delete cascade,
    flag_type flag_type not null,
    severity flag_severity not null,
    detected_at timestamptz not null default now(),
    resolved_at timestamptz,
    metrics jsonb,                                 -- supporting numbers
    diagnosis_md text,                             -- AI-generated diagnosis
    unique (client_id, flag_type, resolved_at)
);

create index if not exists flags_active_idx
    on public.flags (client_id, severity)
    where resolved_at is null;

-- ============================================================
-- reports: generated 7d / 30d reports with shareable tokens
-- ============================================================
create type report_window as enum ('7d', '30d');

create table if not exists public.reports (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid references public.clients(id) on delete cascade,  -- null = agency-wide
    window report_window not null,
    share_token text not null unique,
    generated_at timestamptz not null default now(),
    payload jsonb not null,                        -- KPI snapshot
    ai_summary_md text                             -- Claude narrative
);

create index if not exists reports_client_generated_idx
    on public.reports (client_id, generated_at desc);

-- ============================================================
-- ai_cache: cache Claude responses by payload hash
-- ============================================================
create table if not exists public.ai_cache (
    cache_key text primary key,
    response text not null,
    created_at timestamptz not null default now()
);

create index if not exists ai_cache_created_idx on public.ai_cache (created_at);

-- ============================================================
-- KPI rollup: refresh a client/day row in daily_kpis from
-- fb_insights_daily + ghl_events.
-- ============================================================
create or replace function public.refresh_daily_kpi(
    p_client_id uuid,
    p_date date
) returns void language plpgsql as $$
declare
    v_spend numeric(12,2) := 0;
    v_impressions bigint := 0;
    v_clicks bigint := 0;
    v_ctr numeric(6,4) := 0;
    v_frequency numeric(6,2) := 0;
    v_leads bigint := 0;
    v_bookings bigint := 0;
    v_shows bigint := 0;
    v_sales bigint := 0;
begin
    select
        coalesce(spend, 0),
        coalesce(impressions, 0),
        coalesce(clicks, 0),
        coalesce(ctr, 0),
        coalesce(frequency, 0)
    into v_spend, v_impressions, v_clicks, v_ctr, v_frequency
    from public.fb_insights_daily
    where client_id = p_client_id and date = p_date;

    select
        count(*) filter (where event_type = 'lead'),
        count(*) filter (where event_type = 'booking'),
        count(*) filter (where event_type = 'show'),
        count(*) filter (where event_type = 'sale')
    into v_leads, v_bookings, v_shows, v_sales
    from public.ghl_events
    where client_id = p_client_id
      and occurred_at >= p_date::timestamptz
      and occurred_at <  (p_date + 1)::timestamptz;

    insert into public.daily_kpis (
        client_id, date, spend, impressions, clicks, ctr, frequency,
        leads, bookings, shows, sales,
        cost_per_lead, cost_per_booking, booking_rate, show_rate, updated_at
    ) values (
        p_client_id, p_date, v_spend, v_impressions, v_clicks, v_ctr, v_frequency,
        v_leads, v_bookings, v_shows, v_sales,
        case when v_leads > 0 then v_spend / v_leads end,
        case when v_bookings > 0 then v_spend / v_bookings end,
        case when v_leads > 0 then v_bookings::numeric / v_leads end,
        case when v_bookings > 0 then v_shows::numeric / v_bookings end,
        now()
    )
    on conflict (client_id, date) do update set
        spend = excluded.spend,
        impressions = excluded.impressions,
        clicks = excluded.clicks,
        ctr = excluded.ctr,
        frequency = excluded.frequency,
        leads = excluded.leads,
        bookings = excluded.bookings,
        shows = excluded.shows,
        sales = excluded.sales,
        cost_per_lead = excluded.cost_per_lead,
        cost_per_booking = excluded.cost_per_booking,
        booking_rate = excluded.booking_rate,
        show_rate = excluded.show_rate,
        updated_at = now();
end;
$$;

-- ============================================================
-- Row level security
-- Authenticated agency users can read/write everything.
-- Public (anon) can only read reports by share_token (handled at API layer).
-- ============================================================
alter table public.clients enable row level security;
alter table public.fb_insights_daily enable row level security;
alter table public.ghl_events enable row level security;
alter table public.daily_kpis enable row level security;
alter table public.flags enable row level security;
alter table public.reports enable row level security;
alter table public.ai_cache enable row level security;

create policy "authenticated full access clients"
    on public.clients for all to authenticated using (true) with check (true);
create policy "authenticated full access fb_insights_daily"
    on public.fb_insights_daily for all to authenticated using (true) with check (true);
create policy "authenticated full access ghl_events"
    on public.ghl_events for all to authenticated using (true) with check (true);
create policy "authenticated full access daily_kpis"
    on public.daily_kpis for all to authenticated using (true) with check (true);
create policy "authenticated full access flags"
    on public.flags for all to authenticated using (true) with check (true);
create policy "authenticated full access reports"
    on public.reports for all to authenticated using (true) with check (true);
create policy "authenticated full access ai_cache"
    on public.ai_cache for all to authenticated using (true) with check (true);
