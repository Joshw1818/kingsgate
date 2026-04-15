# Kingsgate CEO Dashboard

Agency-wide dashboard for tracking Facebook Ads + GoHighLevel performance
across all Kingsgate clients. Automatically flags underperforming clients,
generates one-click shareable reports, and uses Claude for optimisation
analysis.

## Features

- **Agency overview** — live KPIs (spend, leads, bookings, CPB, booking rate)
  across every active client, sorted so the biggest problems sit on top.
- **Per-client drill-down** — 30-day charts, active flags, AI recommendations.
- **Automated flagging** — detects low volume (<3 leads/3 days), CPL/CPB over
  target, conversion-rate drops, and ad fatigue. Flags auto-resolve when
  metrics recover.
- **One-click reports** — generate 7-day or 30-day branded reports with a
  public shareable URL (no login required).
- **AI analysis** — Claude Sonnet 4.6 produces a diagnosis + root causes +
  recommended actions for every client/report. Uses prompt caching to keep
  per-call cost low.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase (Postgres, Auth, Edge Functions, pg_cron)
- Anthropic SDK (`claude-sonnet-4-6`) with ephemeral prompt caching
- Recharts

## Demo mode (preview with zero setup)

The dashboard ships with a **demo mode** that serves sample data — five
fake clients, 30 days of realistic KPIs, active flags, and a canned AI
analysis — so you can preview the UI without Supabase, Facebook, GHL, or
Anthropic credentials.

Demo mode is **auto-enabled** whenever `NEXT_PUBLIC_SUPABASE_URL` is not
set, or explicitly with `NEXT_PUBLIC_DEMO_MODE=true`.

### Deploy the demo to Vercel

1. Push the branch (done).
2. In Vercel: **Add New → Project → Import `joshw1818/kingsgate`**.
3. Framework preset: **Next.js** (auto-detected).
4. **Leave all environment variables blank** — demo mode will auto-engage.
5. Click **Deploy**. In ~2 minutes you get a public URL.
6. Open the URL → you're straight into the agency overview with sample
   data. No login required.

To flip to live data later, fill in the env vars from `.env.example` and
redeploy.

## Local setup

```bash
pnpm install
cp .env.example .env.local   # fill in real values
pnpm dev
```

In a second terminal, start Supabase and apply migrations:

```bash
supabase start
supabase db push              # applies supabase/migrations/*.sql
supabase functions serve      # for local edge functions
```

Create an agency staff user in the Supabase dashboard (Auth → Users → Invite).
Email signup is disabled — only admins can add new users.

## Deploying edge functions

```bash
supabase functions deploy sync-fb
supabase functions deploy sync-ghl
supabase functions deploy run-flags

supabase secrets set \
  FB_SYSTEM_USER_TOKEN=... \
  FB_API_VERSION=v21.0 \
  GHL_AGENCY_API_KEY=... \
  GHL_API_BASE=https://services.leadconnectorhq.com
```

Then apply `supabase/migrations/0002_cron.sql` and set the two GUCs noted at
the bottom of that file so pg_cron knows how to call the functions.

## Architecture summary

- `sync-ghl` runs every 15 min (leads/bookings are priority)
- `sync-fb` runs every 30 min
- `run-flags` runs 5 min after each sync and reconciles the `flags` table
- All three call `refresh_daily_kpi(client, date)` to rebuild the
  `daily_kpis` rollup that powers every dashboard query.

## Adding a client

1. `/dashboard/clients/new`
2. Enter the Facebook ad account id (`act_…` — prefix is auto-added if
   missing) and the GHL location id.
3. Set target CPL + target CPB (optional but required for threshold flags).
4. Wait for the next sync tick, or hit the sync endpoints manually via
   `supabase functions invoke sync-fb` / `sync-ghl` / `run-flags`.

## Schema

See `supabase/migrations/0001_init.sql`. Core tables:

- `clients` — one row per agency client
- `fb_insights_daily` — raw daily FB metrics
- `ghl_events` — lead/booking/show/sale events from GHL
- `daily_kpis` — rollup (spend + GHL events joined per day)
- `flags` — active & resolved flag history
- `reports` — generated reports w/ public `share_token`
- `ai_cache` — 6-hour TTL cache for Claude responses by payload hash
