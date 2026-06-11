# Going live — Kingsgate KPI Tracker runbook

This runs in **Claude Code against your repo** — it can't be provisioned from a chat. Build it into the existing **Mission Control** repo (already Next.js + Supabase + Vercel with the client list); if you'd rather keep it separate it's a fresh `create-next-app` and the identical steps. Hand this file + `CLAUDE.md` to Claude Code as the brief.

Starter files in this kit: `0001_init.sql` (runnable migration), `vercel.json` (cron), `.env.example`, `sync/meta.ts` (Meta worker starter). `killFlag.ts` is already built — drop it in `lib/`.

---

## Phase A — Live on mock data (do now · needs nothing from you)

Goal: the whole pipeline deployed and the morning scan rendering on a live URL **before** any real data. Proves the wiring; A is shippable on its own.

1. **Supabase** — create a project (or reuse Mission Control's). Run `0001_init.sql` in the SQL editor (or `supabase db push`). Copy Project URL + `anon` + `service_role` keys.
2. **Repo** — drop `killFlag.ts` into `lib/`. Add `lib/dataSources.ts` exposing `getMorningScan(window)`, `getClientCosts(window)`, `getAgencyMetrics()`, `logAction()` — each queries Supabase and **falls back to mock when the table is empty**. Add a `/morning-scan` route: port the mockup's render (it's already built around `evaluateAccount()` output — just replace the inline mock array with `await getMorningScan(window)`).
3. **Env** — copy `.env.example` → `.env.local`, fill the three Supabase values. Add the same three in Vercel → Settings → Environment Variables.
4. **Deploy** — push to `main`; Vercel auto-deploys.

**Verify:** live URL renders the morning scan; tables empty → mock fallback shows; window pills (Today/3/5/7/30d) switch.

---

## Phase B — Real Meta data (unlocks the actual scan)

**You provide:** confirm the token is a System User token + the `act_` IDs (6 live accounts first).

1. **Token** — Business Manager → System Users → generate a token with `ads_read` on the carpet-cleaning ad accounts. Set `META_ACCESS_TOKEN` (local + Vercel). System User token = never expires.
2. **Seed `clients`** — all 22 rows (roster in CLAUDE.md); fill `meta_ad_account_id` for the 6 live accounts now, the rest as they're wired in.
3. **Worker** — add `lib/sync/meta.ts` (starter provided) + `app/api/sync/meta/route.ts` that calls it. Protect the route with `CRON_SECRET`.
4. **First run** — hit the route once manually; it backfills `last_30d` so 7d/30d views populate from day one.
5. **Cron** — add `vercel.json` (provided). ⚠️ **Vercel cron runs in UTC and ignores DST.** `30 5 * * *` = 06:30 UK in summer (BST), 05:30 in winter — fine for a pre-9am scan. Want it tighter? Use `30 5,6 * * *`. The "Sync now" button calls the same route for intraday checks.

**Verify:** spend/leads/CPL on 5 ad sets match Ads Manager for the same date; flags match what you'd decide by hand; switch to 7d/30d and totals match Ads Manager's date-range view; kill an ad set in Ads Manager, re-sync, confirm yesterday's history is intact.

---

## Phase C — Bookings & cost (unlocks CPB / ROAS)

**You provide:** GHL key type (agency vs per-location) + location IDs + each client's booked-stage name(s).

1. Set `GHL_API_KEY` (or per-location Private Integration tokens — auth header differs).
2. `lib/sync/ghl.ts` — per location, pull opportunities updated today, count transitions into that client's `booked_stage_names` (**Dri-Now: only `ServiceM8 loaded`, never `Job Booked`**). Revenue = opportunity value if set, else `bookings × offer_value`. Upsert `bookings_daily (source='ghl')`. Add it to the cron.
3. Wire the "+ log booking" button → `/api/bookings` → `bookings_daily (source='manual')` for non-pipeline clients.

**Verify:** Diamond/Enviro booking counts match their GHL pipelines; a manual booking shows instantly and survives the next sync; ROAS card matches hand calc.

---

## Phase D — Agency economics (unlocks live MRR / churn)

**You provide:** start/end dates per client (retainers already in the roster).

1. Seed ledger fields: `retainer_monthly`, `billing_type`, `first_50_fee`, `start_date`, `end_date`, `source`.
2. `getAgencyMetrics()` + swap the mockup's **static** agency strip for live values.

**Verify:** MRR shows £7,775, avg £353.41; set a test `end_date` and the month's churn % moves; a client with a 30-day-old `start_date` shows inside the 50-day intro window.

---

## What unlocks each phase (your side, in one place)

| Phase | Needs from you |
|---|---|
| **A** | Nothing — can go live today |
| **B** | Token type confirmed (System User?) + `act_` IDs |
| **C** | GHL key type + location IDs + booked-stage name(s) per client |
| **D** | `start_date`/`end_date` per client + the 14-vs-15 split fixed |

## Guardrails

- **Never commit `.env*`** (keep it in `.gitignore`). Secrets live only in Vercel env.
- `service_role` key is **server-only** — never in client components or a `NEXT_PUBLIC_*` var. Anon key for the browser.
- Protect `/api/sync/*` with `CRON_SECRET` (Vercel auto-sends it as an `Authorization: Bearer` header on cron calls) so only the cron and you can trigger a sync.
- All reads go through `dataSources.ts`; mock fallback stays until each pillar is verified for a week.

**Start with Phase A.** It's live this afternoon and needs nothing — then B the moment you've confirmed the token and dropped in the `act_` IDs.
