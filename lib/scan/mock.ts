// Mock fallback for the Morning Scan (Pillar 0).
//
// Ported from docs/mockups/morning-scan-mockup.html so the seeded data produces
// the SAME flags/lifecycle as the design spec. Rows are shaped exactly like the
// Supabase tables (clients / adset_metrics_daily / bookings_daily) so
// dataSources.ts aggregates mock and live data through one identical path.
//
// Keep this intact until every pillar is live and verified for a week — it is
// what lets the dashboard render before any API token exists.

/** Row shaped like `clients`. */
export interface ClientRow {
  id: string;
  name: string;
  offer_value: number | null;
  roas_target: number;
  tracks_pipeline: boolean;
  retainer_monthly: number | null;
}

/** Row shaped like `adset_metrics_daily`. */
export interface MetricRow {
  client_id: string;
  date: string; // YYYY-MM-DD
  adset_name: string;
  ad_id: string;
  spend: number;
  impressions: number;
  frequency: number | null;
  leads: number;
}

/** Row shaped like `bookings_daily`. */
export interface BookingRow {
  client_id: string;
  date: string;
  bookings: number;
  revenue: number | null;
  source: "ghl" | "manual";
}

export interface RawScanData {
  clients: ClientRow[];
  metrics: MetricRow[];
  bookings: BookingRow[];
}

// Deterministic RNG so the mock renders identically on every load/build.
function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** YYYY-MM-DD for `daysAgo` days before today (UTC). */
function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// The 6 accounts already in Mission Control. Retainers from the CLAUDE.md roster.
const CLIENT_DEFS = [
  { id: "diamond", name: "Diamond", offer: 120, target: 5, tracks: true, bookRate: 0.45, retainer: 400 },
  { id: "mkt", name: "MKT", offer: 99, target: 7, tracks: true, bookRate: 0.35, retainer: 350 },
  { id: "hifi", name: "HiFi", offer: 150, target: 10, tracks: false, bookRate: 0, retainer: 400 },
  { id: "proclean", name: "ProClean", offer: 99, target: 5, tracks: false, bookRate: 0, retainer: 400 },
  { id: "rsclean", name: "RS Clean", offer: 120, target: 7, tracks: true, bookRate: 0.3, retainer: 400 },
  { id: "enviro", name: "Enviro Clean", offer: 150, target: 5, tracks: true, bookRate: 0.4, retainer: 400 },
] as const;

interface AdsetDef {
  c: string;
  name: string;
  seed: number;
  age: number;
  spendBase: number;
  cpl0: number;
  cpl1: number;
  freq0: number;
  freq1: number;
  recent3: ({ s: number; l: number; f: number } | null)[];
}

// recent3 = [day-2, day-1, today] — the explicit last-3-day stories.
const ADSET_DEFS: AdsetDef[] = [
  { c: "proclean", name: "3/5 | 3 for £99 — AS1", seed: 11, age: 30, spendBase: 60, cpl0: 8.0, cpl1: 12.0, freq0: 1.4, freq1: 1.7,
    recent3: [{ s: 55, l: 5, f: 1.6 }, { s: 70, l: 5, f: 1.9 }, { s: 70, l: 4, f: 1.8 }] },
  { c: "rsclean", name: "3/6 | 3 for £120 — AS1", seed: 22, age: 30, spendBase: 22, cpl0: 9.0, cpl1: 9.5, freq0: 1.5, freq1: 1.6,
    recent3: [{ s: 20, l: 2, f: 1.6 }, { s: 24, l: 2, f: 1.6 }, { s: 21, l: 0, f: 1.7 }] },
  { c: "mkt", name: "3/7 | 3 for £99 — AS1", seed: 33, age: 30, spendBase: 33, cpl0: 5.5, cpl1: 6.2, freq0: 1.3, freq1: 1.5,
    recent3: [{ s: 31, l: 5, f: 1.4 }, { s: 35.5, l: 5, f: 1.5 }, { s: 40, l: 5, f: 1.5 }] },
  { c: "enviro", name: "3/9 | 3 for £150 — AS1", seed: 44, age: 30, spendBase: 50, cpl0: 8.0, cpl1: 9.0, freq0: 1.6, freq1: 1.9,
    recent3: [{ s: 45, l: 5, f: 1.9 }, { s: 52.5, l: 5, f: 2.2 }, { s: 60, l: 5, f: 2.6 }] },
  { c: "hifi", name: "3/8 | 3 for £150 — AS1", seed: 55, age: 30, spendBase: 60, cpl0: 8.5, cpl1: 8.5, freq0: 1.6, freq1: 1.8,
    recent3: [{ s: 59.5, l: 7, f: 1.7 }, { s: 61.6, l: 7, f: 1.7 }, { s: 63, l: 7, f: 1.8 }] },
  { c: "diamond", name: "3/6 | 3 for £120 — AS1", seed: 66, age: 30, spendBase: 48, cpl0: 8.0, cpl1: 8.2, freq0: 1.4, freq1: 1.6,
    recent3: [{ s: 50.4, l: 6, f: 1.5 }, { s: 47.4, l: 6, f: 1.6 }, { s: 48, l: 6, f: 1.5 }] },
  { c: "diamond", name: "3/6 | 3 for £120 — AS2", seed: 77, age: 30, spendBase: 34, cpl0: 8.8, cpl1: 8.8, freq0: 1.2, freq1: 1.4,
    recent3: [{ s: 36.4, l: 4, f: 1.3 }, { s: 34.8, l: 4, f: 1.4 }, { s: 34, l: 4, f: 1.4 }] },
  { c: "mkt", name: "5/6 | 3 for £99 — AS2", seed: 88, age: 30, spendBase: 18, cpl0: 4.8, cpl1: 4.8, freq0: 1.1, freq1: 1.2,
    recent3: [{ s: 20, l: 4, f: 1.1 }, { s: 18.8, l: 4, f: 1.2 }, { s: 18, l: 4, f: 1.2 }] },
  { c: "hifi", name: "5/6 | 3 for £150 — AS2", seed: 99, age: 30, spendBase: 28, cpl0: 5.2, cpl1: 5.2, freq0: 1.1, freq1: 1.3,
    recent3: [{ s: 27, l: 5, f: 1.2 }, { s: 25.5, l: 5, f: 1.2 }, { s: 30, l: 6, f: 1.3 }] },
  { c: "enviro", name: "4/6 | 3 for £150 — AS2 (new)", seed: 101, age: 2, spendBase: 8, cpl0: 0, cpl1: 0, freq0: 1.0, freq1: 1.0,
    recent3: [null, { s: 6, l: 0, f: 1.0 }, { s: 9, l: 0, f: 1.1 }] },
];

// Today's actual bookings per tracked client (overrides the last derived day).
const TODAY_BOOKINGS: Record<string, number> = { diamond: 3, mkt: 2, rsclean: 0, enviro: 2 };

function buildMock(): RawScanData {
  const clients: ClientRow[] = CLIENT_DEFS.map((c) => ({
    id: c.id,
    name: c.name,
    offer_value: c.offer,
    roas_target: c.target,
    tracks_pipeline: c.tracks,
    retainer_monthly: c.retainer,
  }));

  const metrics: MetricRow[] = [];
  // daysLeadsByClient[clientId][date] = total leads that day (for bookings derivation)
  const leadsByClientDate = new Map<string, Map<string, number>>();

  for (const d of ADSET_DEFS) {
    const rnd = mulberry32(d.seed);
    const series: { spend: number; leads: number; freq: number }[] = [];

    // History: daysAgo 29 → 3, skipping days before the ad set existed.
    for (let daysAgo = 29; daysAgo >= 3; daysAgo--) {
      if (daysAgo > d.age - 1) continue;
      const t = (29 - daysAgo) / 29; // 0 oldest → 1 newest
      const cpl = (d.cpl0 + (d.cpl1 - d.cpl0) * t) * (0.9 + rnd() * 0.2);
      const spend = r2(d.spendBase * (0.85 + rnd() * 0.3));
      const leads = cpl > 0 ? Math.max(0, Math.round(spend / cpl)) : 0;
      const freq = r2(d.freq0 + (d.freq1 - d.freq0) * t + (rnd() - 0.5) * 0.08);
      series.push({ spend, leads, freq });
    }
    // Explicit last 3 days (day-2, day-1, today), where the ad set already existed.
    d.recent3.forEach((rec, i) => {
      if (rec && 2 - i <= d.age - 1) series.push({ spend: rec.s, leads: rec.l, freq: rec.f });
    });

    // Map series (oldest → newest, ending today) onto real dates.
    const len = series.length;
    series.forEach((row, p) => {
      const date = isoDaysAgo(len - 1 - p);
      metrics.push({
        client_id: d.c,
        date,
        adset_name: d.name,
        ad_id: "",
        spend: row.spend,
        impressions: Math.round(row.spend / 0.012),
        frequency: row.freq,
        leads: row.leads,
      });
      const m = leadsByClientDate.get(d.c) ?? new Map<string, number>();
      m.set(date, (m.get(date) ?? 0) + row.leads);
      leadsByClientDate.set(d.c, m);
    });
  }

  const bookings: BookingRow[] = [];
  for (const c of CLIENT_DEFS) {
    if (!c.tracks) continue;
    const rnd = mulberry32(c.id.length * 97 + 13);
    for (let i = 29; i >= 0; i--) {
      const date = isoDaysAgo(i);
      const dayLeads = leadsByClientDate.get(c.id)?.get(date) ?? 0;
      let bk = Math.max(0, Math.round(dayLeads * c.bookRate * (0.7 + rnd() * 0.5)));
      if (i === 0 && c.id in TODAY_BOOKINGS) bk = TODAY_BOOKINGS[c.id];
      bookings.push({
        client_id: c.id,
        date,
        bookings: bk,
        revenue: bk * c.offer,
        source: "ghl",
      });
    }
  }

  return { clients, metrics, bookings };
}

/** Fresh deterministic copy of the mock dataset. */
export function mockScanData(): RawScanData {
  return buildMock();
}

// Real agency figures (June 2026 roster) — these are NOT fabricated, they come
// straight from the CLAUDE.md ledger and the mockup's agency strip.
export const MOCK_AGENCY = {
  mrr: 9375,
  avgRetainer: 360.58,
  activeClients: 26,
  monthlyChurnPct: 3.6,
  sinceJan: "11 → 26",
  newViaAds: "≈3 in 4",
};
