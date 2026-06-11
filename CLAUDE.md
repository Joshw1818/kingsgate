# CLAUDE.md — Kingsgate Ops (Mission Control / KPI Tracker)

**Read this first in every session. Append to the Progress Log at the end of every pillar/session.**
This is the master context file: the full agency operating picture from Josh's overview doc, plus the current build. The active build is the KPI tracker (Pillars 0–2); everything else Josh does is captured below with a roadmap line so no future session loses it.

---

## 1. How the agency runs (full picture)

### Offers + KPIs (client ad management)
Every carpet cleaning client runs one of three offers — **"3 carpets cleaned for £X"**. Offer is set by region: further north = cheaper (£99), further south = pricier (£150). Josh sets the offer per client.

| Offer | ROAS target | Max cost per booking | Max cost per lead |
|---|---|---|---|
| £99 | 5x | £19.80 | £7.92 |
| £99 | 7x | £14.14 | £5.66 |
| £99 | 10x | £9.90 | £3.96 |
| £120 | 5x | £24.00 | £9.60 |
| £120 | 7x | £17.14 | £6.86 |
| £120 | 10x | £12.00 | £4.80 |
| £150 | 5x | £30.00 | £12.00 |
| £150 | 7x | £21.43 | £8.57 |
| £150 | 10x | £15.00 | £6.00 |

Derivation (never hardcode — `killFlag.ts` computes it): max CPB = offer ÷ ROAS · max CPL = max CPB × 0.40 (4 in 10 leads book) · **kill line = 2 × the 5x-row max CPL**, fixed to the 5x row whatever the client's target.

**Daily routine:** check every ad account each morning against the table. Kill ad sets/creatives at the kill line. Changes are simple — a quick duplicate or a fresh ad with the same offer. Some ads run forever within KPI (dream scenario — leave them alone). Full VA process: `ad-management-sop.md`.

### Service delivery backend
- Every client uses the **same landing page**, branded to their business.
- All leads flow into the client's **dedicated GHL sub-account**; all sub-accounts share the same automations.
- **Lead message sequence:** Message 1 instantly on opt-in · Message 2 at 24 hours · Message 3 at 3 days.
- Clients have an **opportunities pipeline** — some use it, some don't, which is why CVR and cost-per-booking are sometimes invisible. The tracker fixes this via `tracks_pipeline` + manual booking entry (Pillar 2).

### Support & comms
- Josh always answers client **WhatsApp** messages (questions, "things have slowed down", etc.) — stays with Josh, never automated.
- Aim is a **monthly call**, but not strictly necessary — an open reporting link means only-needed/fewer calls. → Roadmap **P3: client report link**.

### Kingsgate's own acquisition funnel
- Josh runs his own ads → landing page → **direct calendar link** to book a meeting.
- **GHL** tracks all calls, the **pipeline** tracks sales stages, bookings via **GHL calendar**.
- **Fathom** records meetings; notes go into GHL.
- **Metrics Josh wants tracked:** show-up rate · conversion rate · cost per meeting · cost per new client · ROAS. → Roadmap **P5: acquisition tracker** (not in Pillars 0–2; do not forget this).

### Agency revenue, pricing & retention

**Pricing model (current):** new clients pay a **£500 one-time fee covering the first 50 days** (the 5K Guarantee period) → then a **rolling £400/mo**, or **£1,000 paid 3 months in advance** (£333.33/mo effective). The varied lower retainers on the books are legacy 3-months-advance deals.

**Client lifecycle & billing (Client Tracker tab — Pillar 2.6):** every client is classified by **stage** (Offer period = within 50 days of start · Recurring = active past day 50 · Churned = ended) and **billing arrangement** (Monthly retainer £400 rolling · Quarterly advance £1,000/3mo · Payment plan, e.g. £250×2 split). Stage, next due date, and overdue/current status are all **computed** from `start_date` + `billing_type` + `billing_anchor_day` — never stored as fields to maintain. Paid status is manual ("mark paid" → `billing_schedule`) until Stripe (P7) writes it automatically.

**Client book — 26 active, effective £/mo** (roster updated June 2026):

| Client | £/mo | Client | £/mo |
|---|---|---|---|
| Carpet Care Services | 400 | MKT | 350 |
| E.M Pro Solutions | 350 | HiFi | 400 |
| Cotswold Cleaning | 400 | Diamond | 400 |
| Enviro Clean Stockport | 400 | RS Clean | 400 |
| Dri-Now Cheltenham | 320 | Pro Clean | 400 |
| Dri-Now Shropshire | 225 | Breeze Cleaning | 400 |
| Enviro Clean Huddersfield | 400 | The Carpet Lab | 400 |
| Mister Clean | 400 | Angus \| Julian (referral) | 266 |
| Pro Clean Cardiff | 400 | Bishops Carpet Cleaning | 400 |
| Dri-Now Maidstone | 266 | Carpet Pride | 400 |
| Dri-Now Colwyn Bay | 266 | Captiv8 Cleaning | 400 |
| Aylco Cleaning | 266 | Clean Home Services | 400 |
| Dri-Now Glasgow | 266 | JK Carpet Clean | 400 |

**Totals:** MRR **£9,375** · average retainer **£360.58/mo** · 17 of 26 at full £400.
**Mix:** 17 × £400 · 2 × £350 (E.M Pro, MKT) · 1 × £320 (Dri-Now Cheltenham) · 5 × £266 (Dri-Now Maidstone/Colwyn Bay/Glasgow, Aylco, Angus|Julian) · 1 × £225 (Dri-Now Shropshire).
**Since 1 January:** 11 → 26 active. Latest 5 onboards (Jun): Pro Clean Cardiff, Carpet Pride, Captiv8 Cleaning, Clean Home Services, JK Carpet Clean.
**⚠️ Two unresolved data points (Josh to confirm):**
1. **Cotswold Cleaning** appeared twice in the source list (both £400) — counted ONCE here. If two separate sites → 27 clients, MRR £9,775, avg £362.04.
2. **The Carpet Doctor (£400)** was on the previous roster, absent from the latest. If still active → add back (27 / £9,775 / £362.04); if churned → 4th loss since Jan, affects churn.
**Note:** Pro Clean Cardiff is a DISTINCT client from Pro Clean — keep as separate ledger rows.
**Churn:** **monthly churn = clients ended in month ÷ active at month start** — exact once the ledger has `start_date`/`end_date` per client. Earlier reported gained/lost split (11 ads + 4 organic = 15 vs 14 stated) still to reconcile.
**TODO Josh:** resolve the two flags above; names + end months of lost clients; start month + source per client (at minimum the post-Jan adds).
→ Build: **Pillar 2.5 — Agency revenue & retention** (MRR, avg retainer, churn, channel split, intro-period count).

### Onboarding flow (end-to-end, current manual process)
1. Send agreement: **Kingsgate_Paid_Ads_5K_Agreement** — https://drive.google.com/open?id=1V4dga3eGIzApVk1a8Ek-vyoxIeiXkPYF
2. Send payment link: https://buy.stripe.com/4gMcN5axAaMddRB0db2oE0v
3. Once signed → kickoff booking: https://api.leadconnectorhq.com/widget/bookings/kingsgate/kickoff
4. On the kickoff call: give GHL sub-account access; get access to their **Facebook page, ad account and Meta pixel**.
5. After: send software tutorials (mobile app + laptop). Desktop portal: **log-in.portal-kingsgate.co.uk** · walkthrough Loom: https://www.loom.com/share/0c27796938a3426aaf0bc9282a8cbfe8?sid=ed3e40ad-02ad-4095-adc4-739666d18f53
6. **GHL setup:** submit regulatory bundle + address bundle · buy phone number · customise landing page to the business · buy + connect domain · customise automated messages · add Meta pixel to the landing page.
7. **Ads setup:** create campaign named `Date | offer` (e.g. `3/6 | 3 For £120`) · 25–30km radius around service area · suggest age 30–65+ · upload all **6 ads in one ad set** from the ads folder (https://drive.google.com/drive/folders/1SSYjGBK73ifM2jGfoGylY7lYOS7wP_S7) · tweak copy per location + offer (north cheaper / south pricier) · landing page URL from GHL · **turn off all Facebook recommendations except the Visual Improvement box** · tell the client ads are launched.

→ Roadmap **P6: onboarding automation** (4 n8n builds already scoped in separate sessions: Stripe→DocuSign→calendar · GHL sub-account provisioning · funnel clone + DNS · Meta ad import with AI copy variants).

### Typical problems → where each is handled

| Problem (from Josh's doc) | Handled by |
|---|---|
| Billing/payment fails at launch or while live | SOP §9 (escalate, don't pause rashly) · root fix in **P7 payments** |
| Facebook bugs | Quick duplication — SOP §4/§9 |
| Not enough Google reviews / trust → CVR < 40% | SOP §7 (flag to Josh — trust issue, not an ad fix) |
| Clients not fast enough / don't call leads | 3-message sequence + **P4 speed-to-lead alerts** (extend the Enviro Clean tracker pattern) |
| Ad fatigue, not adapting fast enough | **⚡ fatigue flag** — live in Pillar 1, always trailing 3 days |
| Clients don't update opportunities → only lead cost visible | `tracks_pipeline` + manual booking entry — **Pillar 2** |
| Clients late paying | **P7: Stripe auto-charge / subscriptions** |

### Hiring plan
**Media buyer VA** first — precondition is the flag digest (Pillar 1) + the written SOP (done: `ad-management-sop.md`). VA executes the flagged list daily; Josh keeps strategy, offers, pricing and client comms. **Setter** later, when Josh's own inbound volume justifies it.

---

## 2. The active build — KPI tracker

Morning Scan dashboard replacing the daily Ads Manager check. Meta supplies spend/leads/frequency; GHL supplies bookings (→ CPB + ROAS); Supabase owns all history. Flags computed at read time by `killFlag.ts`. Window views: Today / 3d / 5d / 7d / 30d. Full spec: `docs/kpi-tracker-build-plan.md`.

### Source-of-truth map

| Data | Source |
|---|---|
| Spend, impressions, leads, frequency (per ad set/ad, daily) | Meta Graph API — `level=ad`, `time_increment=1` |
| Bookings + revenue | GHL opportunities per sub-account — stage transitions into `clients.booked_stage_names` |
| Manual bookings (non-pipeline clients) | Dashboard "+ log booking" → `bookings_daily (source='manual')` |
| KPI thresholds | Computed in `killFlag.ts` — single source of truth, never duplicated |
| Agency MRR / retainer / churn | `clients` ledger in Supabase (retainer_monthly, billing_type, start/end dates, source) — Pillar 2.5 |
| Client lifecycle + due dates | Computed in `getClientTracker()` from `clients` + `billing_schedule` — Pillar 2.6 |
| Sales meetings (P5, later) | GHL agency pipeline + calendar · Fathom recordings |
| Josh's fees (P7, later) | Stripe |

### Build order + status

| # | Scope | Status |
|---|---|---|
| 0 | Supabase schema (migration 0001) + `dataSources.ts` switching layer + mock fallback | CODE SHIPPED — deploy + config pending |
| 1 | Meta sync worker → flags. First run backfills `last_30d`; daily cron 06:30 UK pulls `last_3d` | CODE SHIPPED — deploy + config pending |
| 2 | GHL bookings sync → CPB/ROAS + manual booking entry | NOT STARTED |
| 2.5 | Agency revenue & retention — MRR, avg retainer (£360.58 actual), churn, channel split. Reads the seeded `clients` ledger only | CODE SHIPPED — computes MRR/avg/active from ledger; churn/split = constants pending dates |
| 2.6 | Client Tracker tab — lifecycle stage + billing arrangement + due dates, all computed; manual "mark paid" → `billing_schedule` (Stripe-ready) | CODE SHIPPED — `/client-tracker` on mock; live needs per-client start/billing dates |
| P3 | Client-facing weekly report link (cuts monthly calls to needed-only) | ROADMAP |
| P4 | Speed-to-lead alerts to clients (Enviro pattern, all clients) | ROADMAP |
| P5 | Acquisition tracker — show-up rate, conversion rate, cost/meeting, cost/new client, ROAS | ROADMAP |
| P6 | Onboarding automation (4 n8n builds — scoped separately, lives in n8n not this repo) | IN FLIGHT |
| P7 | Payments — Stripe auto-charge/subscriptions, kills late payers + launch billing fails | ROADMAP |

### Env vars
`SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · `SUPABASE_ANON_KEY` · `META_ACCESS_TOKEN` (System User token) · `GHL_API_KEY` (type TBC: agency vs per-location — auth header differs)
Local: `.env.local` · Prod: Vercel project env.

### Rules — do not break
- The dashboard **never** calls Meta/GHL on render. All reads go through `dataSources.ts` → Supabase only.
- Mock fallback stays until every pillar is live and verified for a week. Don't delete mock data.
- Window views are **read-time aggregation** — no per-window tables. Flags evaluate the selected window's aggregate CPL; **fatigue is always the trailing 3 daily rows**, regardless of window.
- **Dri-Now Shropshire:** only `ServiceM8 loaded` counts as a booking — never `Job Booked`. Per-client stage names live in `clients.booked_stage_names`.
- Sync workers upsert on the unique key — idempotent, safe to re-run. The daily `last_3d` overlap self-heals Meta's late-attributed leads.
- Threshold changes happen in `killFlag.ts` config only — never duplicate the KPI maths anywhere else.
- Offers, pricing, messaging and anything client-facing = **Josh decides**. WhatsApp stays with Josh.

### Per-client config (Josh to fill before Pillar 1)

| Client | Offer | ROAS target | `act_` ID | GHL location ID | Booked stage(s) |
|---|---|---|---|---|---|
| Diamond | | | | | |
| MKT | | | | | |
| HiFi | | | | | |
| ProClean | | | | | |
| RS Clean | | | | | |
| Enviro Clean | | | | | |

These 6 are the accounts already in Mission Control — start here. The full book is **26 accounts** (list in the Agency revenue section); add a config row per account as each gets wired into the scan. All 26 get seeded into the `clients` ledger at Pillar 0 regardless (revenue metrics don't wait for ad wiring).

---

## Progress log

Append per pillar: date · what shipped · env vars added · files created · verification result · next.

- **2026-06-05** — Plan approved. Delivered: `killFlag.ts`, flag tester, morning-scan mockup (windowed Today/3/5/7/30d), build plan, ad-management SOP, this file (expanded to full agency context per Josh). Next: Pillar 0 (Supabase project + migration 0001 + dataSources).
- **2026-06-05 (later)** — Agency economics added: pricing model (£500 covers first 50 days → £400/mo rolling or £1,000/3mo advance), full 22-client roster with retainers, **MRR £7,775 · avg retainer £353.41**, growth/churn since Jan, Pillar 2.5 + ledger columns in migration 0001, agency strip in mockup. Open: 11+4=15 vs 14 gained (confirm), names + start/end months for the 3 lost and 14 gained.
- **2026-06-05 (roster update)** — Book grown to **26 active · MRR £9,375 · avg £360.58** (+£1,600 MRR vs prior). 5 new onboards (Pro Clean Cardiff, Carpet Pride, Captiv8, Clean Home Services, JK Carpet Clean). Updated CLAUDE.md roster, build-plan Pillar 0/2.5 verify figures, mockup agency strip. ⚠️ Unresolved: Cotswold listed twice (counted once); The Carpet Doctor dropped from list (churned or omitted?) — either pushes totals to 27 / £9,775 / £362.04.
- **2026-06-05 (client tracker)** — Added Pillar 2.6 Client Tracker tab: computed lifecycle (offer/recurring/churned) + billing arrangement (monthly/quarterly-advance/payment-plan) + computed next-due + overdue/due-soon status. Schema: `billing_anchor_day`, expanded `billing_type`, new `billing_schedule` table (Stripe-ready, P7 writes to it). Delivered `client-tracker-mockup.html`. Needs from Josh: per-client `start_date` + `billing_type` + `billing_anchor_day`; installment dates for payment-plan clients.
- **2026-06-05 (go-live)** — Pillar 0+1 code shipped in `kingsgate-scan-golive.zip`: migration 0001 + seed (22 clients, sanity check = 22 | 7775 | 353.41), `sync/meta.ts` (30d backfill, daily 3d self-healing pull), `dataSources.ts` (windowed scan + agency metrics + demo fallback), `/scan` page with Mark-done → `actions_log`, Vercel cron 05:30 UTC, `README-GO-LIVE.md` runbook. All TS compiles. Blocked only on: Supabase project, Meta System User token, per-client `act_` IDs + real offers/targets.
- **2026-06-11 (Pillar 0 into the live repo)** — Kit adopted as source of truth and **Pillar 0 built into the existing `kingsgate` Next.js repo** (which already held a separate "CEO Dashboard" build — left intact for later salvage of its auth / Claude analysis / reports). Shipped:
  - Dropped in `CLAUDE.md`, `docs/` (build plan, live-setup, ad SOP), `docs/mockups/` (3), `lib/killFlag.ts` (unchanged), `lib/sync/meta.ts` (env aligned to `NEXT_PUBLIC_SUPABASE_URL`), `vercel.json` (cron 05:30 UTC = 06:30 UK).
  - Schema added as **`supabase/migrations/0004_kpi_tracker.sql`** (kit's tracker schema; defines its own `clients`/`adset_metrics_daily`/`bookings_daily`/`actions_log`/`billing_schedule`, distinct from the CEO dashboard's `0001`). Header notes it's meant for the tracker's own Supabase project. **Not yet run against any project** — deploy/config still Josh's step.
  - `lib/dataSources.ts` switching layer: `getMorningScan` / `getClientCosts` / `getAgencyMetrics` / `getClientTracker` (stub, gated on 2.6 seed) / `logAction`. Queries Supabase (service client), **falls back to deterministic mock when tables empty / demo mode**. Window views = pure read-time aggregation; fatigue always trailing 3 daily rows.
  - `lib/scan/mock.ts` ported from the morning-scan mockup (same seeded data → same flags); `lib/scan/types.ts` shared types.
  - `/morning-scan` route (`app/morning-scan/page.tsx` server + `MorningScanClient.tsx` client) matching the dark mockup: window pills Today/3/5/7/30d, summary strip, flag counts, action queue worst-first (+ show/hide greens), Cost & ROAS table, agency strip (£9,375 / £360.58 / 26), today's log with client-side Mark-done.
  - **Verified:** `pnpm typecheck` + `pnpm build` clean; `pnpm start` → `GET /morning-scan` 200, scan renders server-side worst-first (KILL top), flags compute (3 KILL / 2 WARN / 2 WATCH / 2 FATIGUE), all 6 accounts + agency MRR render. Env vars added to `.env.example`: `META_ACCESS_TOKEN`, `CRON_SECRET`, `GHL_API_KEY`.
  - **STOPPED after Pillar 0** per the kickoff. Next (Josh's gate): create the tracker's Supabase project + run `0004`, then add Meta System User token + per-client `act_` IDs to unlock Pillar 1. Pure-DB Pillars 2.5/2.6 can also go next once the ledger is seeded.
- **2026-06-11 (Pillars 2.5 + 2.6)** — Both pure-DB pillars built (no API tokens). Shipped:
  - `lib/scan/billing.ts` — pure, shared lifecycle/billing logic ported from `client-tracker-mockup.html`: stage (offer/recurring/churned), next due per `billing_type` (rolling anchor day · advance_3mo quarter · payment_plan installments · offer-period £500-upfront → first retainer at offer end), overdue/due_soon/current status. Used by both server and client so "mark paid" re-derives next due in the browser with identical rules.
  - `lib/scan/ledger.ts` — the seeded 26-client book (real retainers, illustrative dates) = mock fallback for 2.5/2.6. Reproduces **MRR £9,375 · avg £360.58 · 26 active**. `AGENCY_FACTS` holds churn ≈3.6% / "11→26" / "≈3 in 4" as constants until per-client dates land.
  - `dataSources.ts`: **2.5** `getAgencyMetrics()` now computes MRR/avg/active from retainers (works the moment retainers are seeded — its actual gate — independent of the 2.6 date gate); **2.6** `getClientLedger`/`getClientTracker()` map `clients`+`billing_schedule` → computed rows, soonest-due first, mock fallback; `markPaid()` writes a paid `billing_schedule` row (no-op in demo).
  - `/client-tracker` route (`page.tsx` + `ClientTrackerClient.tsx`) matching the mockup: summary cards (active / in-offer / overdue £ / due ≤7d £ / MRR / avg), stage+status filters, sortable table, optimistic Mark-paid. Shared dark theme extracted to `lib/scan/theme.ts` (`.mc-root`) + `MissionControlNav` tab bar wired into both Morning Scan and Client Tracker.
  - `supabase/seed_clients.sql` — 26 clients with real retainers + billing_type (unlocks live 2.5); template UPDATEs for the 2.6 dates/installments Josh still owns.
  - **Verified:** typecheck + build clean; `/client-tracker` 200 → MRR £9,375, avg £360.58, 26 active, 4 in offer (Day X/50), overdue 8·£3,248, due ≤7d 5·£1,920, stages/statuses/arrangements render, mark-paid advances due; `/morning-scan` still 200 with the new nav.
  - **Needs from Josh for live 2.6:** per-client `start_date` + `billing_type` + `billing_anchor_day`; installment rows for payment-plan clients. For exact churn/channel split (2.5): end months of lost clients + start month/source per client.
