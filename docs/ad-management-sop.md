# Kingsgate — Daily Ad Management SOP

**Scope:** daily Meta ads for carpet cleaning clients.
**Owner:** _[VA name]_ · **Reviewed by:** Josh · **Cadence:** every morning.
**Log:** record every change in _[log location — sheet/Notion]_.

You're running a system, not inventing one. Follow the flag, make the change, log it. The grey areas go to Josh (§8) — when unsure, escalate rather than guess.

---

## 1. The numbers that govern everything

Every client runs one of three offers — **"3 carpets cleaned for £X"**:

| Offer | ROAS target | Max cost per booking | Max cost per lead |
|-------|-------------|----------------------|-------------------|
| £99   | 5x | £19.80 | £7.92 |
| £99   | 7x | £14.14 | £5.66 |
| £99   | 10x | £9.90 | £3.96 |
| £120  | 5x | £24.00 | £9.60 |
| £120  | 7x | £17.14 | £6.86 |
| £120  | 10x | £12.00 | £4.80 |
| £150  | 5x | £30.00 | £12.00 |
| £150  | 7x | £21.43 | £8.57 |
| £150  | 10x | £15.00 | £6.00 |

**How the table is built** (so you can do it for any offer, not just memorise it):

- **Max cost per booking** = offer ÷ ROAS target — e.g. £120 ÷ 5 = £24.
- **Max cost per lead** = max cost per booking × **0.40** (we assume 4 in 10 leads book).
- **Kill line** = **2 × the max cost per lead on the 5x row.** This is **fixed to the 5x row** even for clients aiming at 7x or 10x. Kill lines: **£99 → £15.84 · £120 → £19.20 · £150 → £24.00.**

**Offer by region:** further north = cheaper offer (£99), further south = pricier (£150). **Josh sets the offer per client — never change it** (§8).

---

## 2. The flag system (matches the dashboard)

Open the Mission Control dashboard first. Each ad set carries a flag. Work the list **top-down, worst first**:

| Flag | Means | Do |
|------|-------|----|
| 🔴 **KILL** | CPL at/above the kill line (2× the 5x max), **or** kill-line's worth of spend with zero leads | Kill the ad set/creative, then **replace immediately** (duplicate a winner or fresh ad, same offer) |
| 🟠 **WARN** | CPL above the 5x floor but below the kill line — below minimum ROAS | Watch closely today; if it climbs toward the kill line, duplicate/refresh **before** it tips |
| 🟡 **WATCH** | CPL above the client's target but still inside the 5x floor — profitable, just under goal | Leave it; review tomorrow |
| 🟢 **GREEN** | CPL at/under target | No action |
| ⚪ **LEARNING** | Too little spend / no leads to judge | Leave running; re-check next scan |
| ⚡ **FATIGUE** | CPL **and** frequency both rising 3 days straight — can show on any flag, including green | Queue a fresh creative **now**, don't wait for WARN/KILL |

---

## 3. Daily routine

1. Open the dashboard. Note every 🔴 / 🟠 / ⚡.
2. Top-down by severity, **confirm the flag in Ads Manager** — spend, leads, CPL, frequency, for today **and** the last 3 days.
3. Act per §4. **One change at a time.**
4. **Log it** — account, ad set, what, why (tie to the flag), CPL before, time.
5. Sweep all accounts for **billing / delivery errors** (§9).
6. Anything outside your remit → escalate now (§8). Don't sit on it.

Once flags are reviewed this is a 5–15 minute job.

---

## 4. Decision rules — kill / duplicate / fresh / leave

- **Leave:** GREEN, WATCH, LEARNING (and no fatigue).
- **Duplicate** (same ad → new ad set): a winner you want to reset/scale, **or** a killed ad set whose creative was working before it fatigued — duplicating into a fresh ad set resets delivery.
- **Fresh ad, same offer:** creative-level fatigue, or a creative that never performed — swap in a new creative from the [Carpet Cleaning Ads] folder, same offer and same landing page.
- **Kill:** any 🔴 — then replace straight away so the account isn't dark.

**Quick test:**
Ad set bad but creative historically good → **duplicate.**
Creative itself stale or never worked → **fresh ad.**
Whole offer/region failing across multiple ad sets → **escalate** (don't touch the offer).

---

## 5. Building the replacement (same every time)

- **Campaign name:** `Date | offer` — e.g. `3/6 | 3 for £120`.
- **Radius:** 25–30km around the service area.
- **Age:** 30–65+.
- Upload the **6 ads in one ad set**; tweak copy to location + offer.
- **Landing page:** paste the client's GHL landing page URL.
- Turn **OFF all Facebook recommendations except "Visual Improvement"** (leave that one on).
- **Don't touch** pixel / page / domain — that's done at onboarding.

---

## 6. Fatigue — catch it early

Frequency creeping up **and** CPL drifting up over ~3 days = fatigue, even while still green. Queue a fresh creative before it tips into WARN/KILL. This is the single biggest lever on "we reacted too slowly" — be proactive here.

---

## 7. Conversion & tracking notes

- **Cheap leads, no bookings, CVR under 40%** is usually **trust, not ads** — thin Google reviews or slow/no callbacks. Flag to Josh; don't burn budget on ad changes chasing it.
- Some clients don't update the **GHL opportunities tab**, so we only see lead cost, not cost-per-booking. Don't write an ad set off on lead cost alone if bookings aren't logged — note it and check with Josh.
- Every lead gets **3 auto-messages** (instant / 24h / 3 days) from GHL. If a client says it's "gone quiet," check the lead was actioned **before** touching ads.

---

## 8. Escalate to Josh — don't decide these

- Any change to **offer, price, or messaging/copy** beyond swapping approved creatives.
- **Budget increases** beyond the client's set daily cap.
- **Billing/payment failures**, account flags, or anything needing client contact.
- A **whole account or offer** underperforming (not just one ad set).
- Anything **client-facing in writing** — Josh handles client comms.
- Anything you're unsure about.

**Decide freely on:** kills, duplicates, and fresh ads using existing approved creatives within the current offer.

---

## 9. Known problems & first response

- **Billing fail on launch / live:** don't pause rashly — flag to Josh (it's client payment + comms).
- **FB bug / ad set not delivering:** a quick **duplicate** usually clears it.
- **Low reviews / CVR < 40%:** trust issue → **escalate**, not an ad fix.
- **Leads not called fast enough:** check the speed-to-lead / last-action signal; flag the client to Josh.
- **Ad fatigue:** see §6.

---

## 10. Logging

Every change recorded: **date/time · client · campaign/ad set · action · reason (flag) · CPL before.** This keeps Josh's dashboard view honest and lets him spot patterns across clients.
