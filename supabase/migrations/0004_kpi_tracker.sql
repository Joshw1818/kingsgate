-- 0004_kpi_tracker.sql — Kingsgate KPI Tracker (Mission Control) schema.
-- This is the source-of-truth data model for the Morning Scan (see CLAUDE.md).
-- NOTE: it defines its OWN `clients` table (offer_value / roas_target / retainer
-- ledger), distinct from the legacy CEO-dashboard `clients` in 0001_init.sql.
-- The two schemas are NOT meant to share one database — run this against the
-- KPI tracker's Supabase project (create a fresh one if needed). Until real
-- data is wired, dataSources.ts falls back to mock so the dashboard renders.
-- Run in Supabase SQL editor or via `supabase db push`.
-- gen_random_uuid() is available by default on Supabase (pgcrypto preinstalled).

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  offer_value numeric,                    -- 99 / 120 / 150 (null until ads wired)
  roas_target numeric default 5,          -- 5 / 7 / 10
  meta_ad_account_id text,                -- act_XXXX
  ghl_location_id text,                   -- sub-account
  booked_stage_names text[] default '{}', -- e.g. {'ServiceM8 loaded'} for Dri-Now
  tracks_pipeline boolean default true,
  -- agency revenue & retention ledger (Pillar 2.5)
  retainer_monthly numeric,               -- effective £/mo: 400 rolling, 333.33 on 3mo-advance, legacy varies
  billing_type text check (billing_type in ('rolling','advance_3mo','payment_plan')),
  billing_anchor_day int,                 -- day-of-month a rolling retainer is due (defaults to start_date day)
  first_50_fee numeric default 500,       -- one-time, covers days 1-50 (5K Guarantee period)
  start_date date,
  end_date date,                          -- null = active client
  source text check (source in ('ads','organic','referral'))
);

create table if not exists adset_metrics_daily (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  date date not null,
  campaign_id text, campaign_name text,
  adset_id text not null, adset_name text,
  -- ad_id is NOT NULL DEFAULT '' so the unique key works with supabase upsert
  -- (a unique index on coalesce(ad_id,'') can't be targeted by onConflict).
  ad_id text not null default '', ad_name text,
  spend numeric not null default 0,
  impressions int not null default 0,
  frequency numeric,
  leads int not null default 0,
  synced_at timestamptz default now(),
  unique (client_id, date, adset_id, ad_id)
);
create index if not exists idx_metrics_client_date on adset_metrics_daily (client_id, date);

create table if not exists bookings_daily (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  date date not null,
  bookings int not null default 0,
  revenue numeric,                        -- default: bookings * offer_value
  source text not null check (source in ('ghl','manual')),
  unique (client_id, date, source)
);

create table if not exists actions_log (   -- doubles as the SOP change log
  id uuid primary key default gen_random_uuid(),
  ts timestamptz default now(),
  client_id uuid references clients(id),
  adset_id text, adset_name text,
  action text not null,                   -- killed / duplicated / fresh ad / held
  reason text,                            -- the flag + CPL at time of action
  cpl_before numeric,
  done_by text default 'Josh'
);

-- Client Tracker billing ledger (Pillar 2.6). Also the table Stripe (P7) writes to.
-- Explicit rows for offer fees + payment-plan installments + invoiced advances;
-- rolling/advance "next due" is computed in dataSources, so recurring rows don't pile up.
create table if not exists billing_schedule (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  due_date date not null,
  amount numeric not null,
  kind text check (kind in ('offer_fee','retainer','advance_quarter','installment')),
  status text default 'scheduled' check (status in ('scheduled','paid')), -- overdue is COMPUTED: scheduled AND due_date < today
  paid_date date,
  source text default 'manual' check (source in ('manual','stripe')),
  stripe_ref text,
  note text
);
create index if not exists idx_billing_client_due on billing_schedule (client_id, due_date);
