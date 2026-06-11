# Kingsgate KPI Tracker — Build Plan (trimmed)

**Goal:** kill the morning Ads Manager scan. One screen, synced before you wake up, flags pre-computed, worst-first. Meta = spend/leads/frequency. GHL = bookings → CPB + ROAS (the cost part). Supabase owns the data.

**What this replaces from the template:** only Pillars 0, 0.5 (slimmed), 1 and 2 survive. Forms/scheduling (GHL does both), call recorders, lead scoring, Slack parsers, video/social, and external payment processors are cut — not needed for this tracker.

---

## Architecture (same shape as the template, two sources only)

```
Meta Graph API          GHL API (per sub-account)
      |                          |
      v                          v
  sync/meta.ts              sync/ghl.ts        <- cron workers (write side)
      \                        /
       v                      v
       +----- SUPABASE ------+                 <- source of truth + history
       | clients             |
       | adset_metrics_daily |
       | bookings_daily      |
       | actions_log         |
       +---------------------+
                 |
                 v
        dataSources.ts                          <- read side, joins 3-day
                 |                                 history, runs killFlag.ts
                 v
        Morning Scan dashboard
```

- **Dashboard never hits Meta/GHL on render.** Reads Supabase only. Fast, no rate limits, history permanent.
- **Flags are computed at read time** by `killFlag.ts` (already built — drops in unchanged). No flags table; change the config, every historical day re-evaluates.
- **Fatigue works from day 3** because we store daily rows per ad set (frequency + CPL trend). This was the blocker — owning the store removes it.

---

## Schema (migration 0001)

```sql
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  offer_value numeric not null,          -- 99 / 120 / 150
  roas_target numeric not null default 5, -- 5 / 7 / 10
  meta_ad_account_id text,               -- act_XXXX
  ghl_location_id text,                  -- sub-account
  booked_stage_names text[] default '{}',-- e.g. {'ServiceM8 loaded'} for Dri-Now
  tracks_pipeline boolean default true,
  -- agency revenue & retention ledger (Pillar 2.5)
  retainer_monthly numeric,              -- contracted effective £/mo (400 rolling, 333.33 on advance, legacy varies)
  billing_type text check (billing_type in ('rolling','advance_3mo')),
  first_50_fee numeric default 500,      -- one-time, covers days 1–50 (5K Guarantee period)
  start_date date,
  end_date date,                         -- null = active client
  source text check (source in ('ads','organic','referral'))
);

create table adset_metrics_daily (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  date date not null,
  campaign_id text, campaign_name text,
  adset_id text not null, adset_name text,
  ad_id text not null default '', ad_name text, -- ad-level rows ('' = adset-level); default keeps the upsert key plain
  spend numeric not null default 0,
  impressions int not null default 0,
  frequency numeric,
  leads int not null default 0,
  synced_at timestamptz default now(),
  unique (client_id, date, adset_id, ad_id)
);

create table bookings_daily (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  date date not null,
  bookings int not null default 0,
  revenue numeric,                       -- default: bookings * offer_value
  source text not null check (source in ('ghl','manual')),
  unique (client_id, date, source)
);

create table actions_log (                -- this IS the SOP's [log location]
  id uuid primary key default gen_random_uuid(),
  ts timestamptz default now(),
  client_id uuid references clients(id),
  adset_id text, adset_name text,
  action text not null,                  -- killed / duplicated / fresh ad / held
  reason text,                           -- the flag + CPL at time of action
  cpl_before numeric,
  done_by text default 'Josh'
);
```

`bookings_daily.source='manual'` is the slim override layer: a "+ log booking" button for clients who don't touch the pipeline. GHL rows and manual rows coexist; reads prefer GHL when present, manual fills the gaps. Non-destructive, auditable, same spirit as the template's overrides table without the generic machinery.

---

## Pillar 0 — Supabase foundation + switching layer

**Effort: S–M · Dependencies: none**

1. Create Supabase project. Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (local `.env.local` + Vercel project env).
2. Run migration 0001 above. Seed `clients` with **all 26 accounts** (roster + retainers in CLAUDE.md): the 6 already in Mission Control get full ads config (offer, target, act_ id, location id, booked-stage names); the rest get ledger fields now and ads config as each is wired into the scan.
3. `src/lib/dataSources.ts`:
   - `getMorningScan(window)` — `window ∈ {1, 3, 5, 7, 30}` days, rolling, includes today. Aggregates `adset_metrics_daily` over the window, shapes into `AdSetMetrics[]`, runs `evaluateAccount()` from `killFlag.ts`, returns worst-first. **Flags evaluate the selected window's aggregate CPL against the same thresholds** (Today = reactive morning scan; 7d/30d = "is this ad set within KPI overall"). **Fatigue is always computed from the trailing 3 daily rows regardless of window** — it's a right-now trend signal and would be hidden by long averages.
   - `getClientCosts(window)` — per-client rollup over the same windows: spend, leads, CPL, bookings, CPB, revenue, ROAS, `tracks_pipeline` status.
   - Window views are pure read-time aggregation — the daily-rows schema already supports them, no migration needed. This is the payoff of owning the store.
   - `logAction(entry)` — insert into `actions_log`.
   - Empty tables → mock fallback so local dev renders.
4. **Verify:** tables exist, dashboard renders mock unchanged, `select * from adset_metrics_daily` empty.

## Pillar 1 — Meta sync → flags (the morning scan)

**Effort: M · Dependencies: Pillar 0**

1. Token: use a **System User token** from Business Manager (doesn't expire like a 60-day user token). Env: `META_ACCESS_TOKEN`. Ad account IDs live per-client in `clients`.
2. `src/lib/sync/meta.ts` — for each active client: `GET /act_{id}/insights` with `level=ad`, `time_increment=1` (daily rows), fields `spend, impressions, frequency, actions, campaign_id, campaign_name, adset_id, adset_name, ad_id, ad_name`. **First run backfills `date_preset=last_30d`** so the 7d/30d views are populated from day one; the daily cron then pulls `last_3d` — the 3-day overlap self-heals Meta's late-attributed leads. Map lead actions (`lead` / leadgen action types) → `leads`. Upsert into `adset_metrics_daily` (idempotent on the unique key — re-runs safe).
3. Cron: Vercel cron at **06:30 UK daily** (works on the most limited cron tier) + a `POST /api/sync/meta` route behind auth as the "Sync now" button for intraday re-checks. Tighten to hourly later if the plan allows.
4. Wire the Morning Scan view to `getMorningScan()`.
5. **Verify:** spot-check 5 ad sets' spend/leads/CPL against Ads Manager same date; flags match what you'd have decided by hand; kill one ad set in Ads Manager, re-sync, confirm yesterday's history still intact; switch to 7d and 30d and check totals against Ads Manager's matching date-range view.

## Pillar 2 — GHL bookings → CPB + ROAS (the cost part)

**Effort: M · Dependencies: Pillar 0 (runs fine before/parallel to 1)**

1. Env: `GHL_API_KEY` (agency) or per-location Private Integration tokens — confirm which you hold; auth header differs.
2. `src/lib/sync/ghl.ts` — per client location: pull opportunities updated today; count stage transitions into that client's `booked_stage_names` (Dri-Now: only `ServiceM8 loaded` counts — never `Job Booked`). Revenue = opportunity value if set, else `bookings × offer_value`. Upsert `bookings_daily (source='ghl')`.
3. "+ log booking" button → `bookings_daily (source='manual')` for the non-pipeline clients.
4. Cost strip + per-client table read `getClientCosts()`: CPB = spend ÷ bookings, ROAS = revenue ÷ spend. Clients without data show "pipeline not updated" instead of fake zeros.
5. **Verify:** Diamond/Enviro booking counts match their GHL pipelines for the day; a manual booking shows instantly and survives the next GHL sync; ROAS card matches hand calc.

---

## Pillar 2.5 — Agency revenue & retention (avg retainer + churn)

**Effort: S · Dependencies: Pillar 0 only — no external APIs, reads the `clients` ledger**

1. Seed all **26 clients** with `retainer_monthly`, `billing_type`, `start_date`, `end_date`, `source` (the list with retainers lives in CLAUDE.md → Agency revenue section).
2. `getAgencyMetrics(window)` in dataSources: active count · **MRR** = Σ `retainer_monthly` (active) · **avg retainer** = MRR ÷ active · **monthly churn** = clients ended in month ÷ active at month start · gained/lost over the window · channel split (ads vs organic/referral) · clients still inside the first-50-days intro.
3. New-client pricing handled as: **£500 one-time covers days 1–50** → reported as one-time onboarding revenue, kept out of MRR; `retainer_monthly` is the contracted roll-on rate (£400 rolling, or £333.33 effective on £1,000 / 3-months-advance).
4. Dashboard: an "Agency" stat row on the Morning Scan (later merges with the P5 acquisition metrics into one Kingsgate-health view).
5. **Verify against actuals:** avg retainer **£360.58** · MRR **£9,375** · **26 active** (Cotswold counted once — listed twice in source; The Carpet Doctor dropped from latest roster — confirm churned vs omitted, either pushes to 27 / £9,775 / £362.04). Since 1 Jan: 11 → 26 active. ⚠️ earlier gained split 11 ads + 4 organic = 15 vs 14 stated, still to reconcile before seeding `source`.

---

## Pillar 2.6 — Client Tracker tab (billing lifecycle + due dates)

**Effort: S–M · Dependencies: Pillar 0 (ledger) — reads `clients` + `billing_schedule`, no external API**

1. **Schema** (in migration 0001): `billing_anchor_day` on `clients`; `billing_type` expanded to `rolling` / `advance_3mo` / `payment_plan`; `billing_schedule` table (also the payment ledger Stripe/P7 will write to).
2. **Seed** `billing_type`, `start_date`, `billing_anchor_day` per client; payment-plan clients get `billing_schedule` installment rows; an `offer_fee` row per client at onboarding.
3. **`getClientTracker()`** computes per client — nothing stored that can go stale:
   - **Stage**: `offer` (today within 50 days of `start_date`) · `recurring` (active past day 50) · `churned` (`end_date` set).
   - **Next due**: `payment_plan` → earliest unpaid `billing_schedule` row · `rolling` → next `billing_anchor_day` occurrence · `advance_3mo` → next quarter boundary from `start_date`. Offer-period clients who paid the £500 upfront → first retainer at offer end.
   - **Status**: `overdue` (unpaid & `due_date` < today) · `due_soon` (≤7 days) · `current`.
4. **Tab UI**: sortable by next due (overdue/soonest first), filter by stage/status, summary cards (in offer · overdue £ · due ≤7d £ · MRR).
5. **Mark paid** (interim): writes a `billing_schedule` row `status='paid'` and advances the next due — same override pattern as manual bookings. **Live paid status arrives with Stripe (P7)**: it writes the same table with `source='stripe'`, reconciling by matching payments to scheduled rows, and the manual button retires.

**Verify:** offer-period clients show `Day X/50` + offer-end date; a payment-plan client shows the next installment; mark one paid → next due advances; an overdue client surfaces at the top.

---

## Open items (need from you before Pillar 1 goes live)

1. **Per-client config:** ad account IDs (`act_…`), GHL location IDs, and each client's booked-stage name(s) — one row each for the 6 accounts.
2. **Token type:** is your Facebook token a System User token or a short-lived user token? If short-lived, 10 minutes in Business Manager fixes it permanently.
3. **GHL key type:** agency key or per-location? Changes the auth header, nothing else.
4. **Cron tier:** confirm Vercel plan — daily cron is enough for v1 either way.
5. **Churn ledger data (for Pillar 2.5):** names of the 3 clients lost since January (+ end month), and start month + source per client — at minimum for the 14 gained since January. MRR and average retainer work without this; exact monthly churn needs it.
