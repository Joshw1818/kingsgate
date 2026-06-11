// ledger.ts — the 26-client agency book, mock fallback for Pillars 2.5 + 2.6.
//
// Retainers are REAL (the June 2026 roster in CLAUDE.md → MRR £9,375, avg
// £360.58, 26 active). start_date / billing_type / billing_anchor_day and the
// payment-plan installments are ILLUSTRATIVE — ported from the client-tracker
// mockup so the tab renders fully — until Josh seeds the real values (see the
// Pillar 2.6 gate). dataSources.ts maps live Supabase rows into this same
// LedgerClient shape, so the computation path is identical for mock and live.

import type { LedgerClient } from "@/lib/scan/billing";

const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Channel split + churn rate are stated in CLAUDE.md but not yet attributable
// per client (start/end months unconfirmed), so they stay as documented
// constants until the ledger carries real dates.
export const AGENCY_FACTS = {
  monthlyChurnPct: 3.6,
  sinceJan: "11 → 26",
  newViaAds: "≈3 in 4",
};

const BOOK: Omit<LedgerClient, "id">[] = [
  // —— offer period (started within 50 days) ——
  { name: "Pro Clean Cardiff", mrr: 400, start: "2026-05-28", type: "rolling", anchor: 28, paidUpfront: true },
  { name: "Carpet Pride", mrr: 400, start: "2026-05-20", type: "rolling", anchor: 20, paidUpfront: true },
  { name: "Captiv8 Cleaning", mrr: 400, start: "2026-05-10", type: "payment_plan", recur: 400,
    plan: [{ due: "2026-05-10", amount: 250, paid: true }, { due: "2026-06-09", amount: 250, paid: false }] },
  { name: "Clean Home Services", mrr: 400, start: "2026-04-28", type: "rolling", anchor: 28, paidUpfront: true },
  { name: "JK Carpet Clean", mrr: 400, start: "2026-04-20", type: "payment_plan", recur: 400,
    plan: [{ due: "2026-04-20", amount: 250, paid: true }, { due: "2026-05-20", amount: 250, paid: false }] },
  // —— recurring monthly £400 ——
  { name: "Carpet Care Services", mrr: 400, start: "2025-11-03", type: "rolling", anchor: 3, paid: true },
  { name: "Cotswold Cleaning", mrr: 400, start: "2025-10-12", type: "rolling", anchor: 12, paid: false },
  { name: "Enviro Clean Stockport", mrr: 400, start: "2025-09-01", type: "rolling", anchor: 1, paid: false },
  { name: "Enviro Clean Huddersfield", mrr: 400, start: "2025-12-20", type: "rolling", anchor: 20, paid: false },
  { name: "Mister Clean", mrr: 400, start: "2025-08-25", type: "rolling", anchor: 25, paid: false },
  { name: "HiFi", mrr: 400, start: "2025-10-08", type: "rolling", anchor: 8, paid: false },
  { name: "Diamond", mrr: 400, start: "2025-07-15", type: "rolling", anchor: 15, paid: false },
  { name: "RS Clean", mrr: 400, start: "2025-11-02", type: "rolling", anchor: 2, paid: true },
  { name: "Pro Clean", mrr: 400, start: "2025-09-18", type: "rolling", anchor: 18, paid: false },
  { name: "Breeze Cleaning", mrr: 400, start: "2025-12-10", type: "rolling", anchor: 10, paid: false },
  { name: "The Carpet Lab", mrr: 400, start: "2026-01-28", type: "rolling", anchor: 28, paid: false },
  { name: "Bishops Carpet Cleaning", mrr: 400, start: "2025-10-05", type: "rolling", anchor: 5, paid: false },
  // —— recurring monthly, other rates ——
  { name: "E.M Pro Solutions", mrr: 350, start: "2025-08-22", type: "rolling", anchor: 22, paid: false },
  { name: "MKT", mrr: 350, start: "2025-07-09", type: "rolling", anchor: 9, paid: false },
  { name: "Dri-Now Cheltenham", mrr: 320, start: "2025-11-14", type: "rolling", anchor: 14, paid: false },
  // —— quarterly advance ——
  { name: "Dri-Now Maidstone", mrr: 266, start: "2025-12-08", type: "advance_3mo", paid: true },
  { name: "Dri-Now Colwyn Bay", mrr: 266, start: "2025-11-20", type: "advance_3mo", paid: true },
  { name: "Dri-Now Glasgow", mrr: 266, start: "2026-01-15", type: "advance_3mo", paid: true },
  { name: "Aylco Cleaning", mrr: 266, start: "2025-10-30", type: "advance_3mo", paid: true },
  { name: "Angus | Julian (ref)", mrr: 266, start: "2026-03-01", type: "advance_3mo", paid: false },
  { name: "Dri-Now Shropshire", mrr: 225, start: "2025-09-10", type: "advance_3mo", paid: true },
];

export function mockLedger(): LedgerClient[] {
  return BOOK.map((c) => ({ ...c, id: slug(c.name), plan: c.plan?.map((p) => ({ ...p })) }));
}
