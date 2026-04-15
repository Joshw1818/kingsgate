// Demo mode — lets you preview the UI without any Supabase / FB / GHL /
// Anthropic credentials. Auto-enabled when NEXT_PUBLIC_SUPABASE_URL is
// unset, or when NEXT_PUBLIC_DEMO_MODE="true" is explicitly set.

import type {
  Client,
  DailyKpi,
  Flag,
  Report,
} from "./supabase/types";

export function isDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return true;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return true;
  return false;
}

// ------------------------------------------------------------------
// Fake clients — five agency clients with varied performance so every
// flag type is visible on the dashboard.
// ------------------------------------------------------------------
export const DEMO_CLIENTS: Client[] = [
  {
    id: "demo-bright-dental",
    name: "Bright Dental",
    fb_ad_account_id: "act_100000000000001",
    ghl_location_id: "loc_bright",
    target_cpl: 25,
    target_cost_per_booking: 120,
    monthly_budget: 6000,
    notes: null,
    active: true,
    created_at: "2025-09-01T00:00:00Z",
    updated_at: "2026-04-15T00:00:00Z",
  },
  {
    id: "demo-metro-medspa",
    name: "Metro Med Spa",
    fb_ad_account_id: "act_100000000000002",
    ghl_location_id: "loc_metro",
    target_cpl: 30,
    target_cost_per_booking: 150,
    monthly_budget: 8000,
    notes: null,
    active: true,
    created_at: "2025-08-15T00:00:00Z",
    updated_at: "2026-04-15T00:00:00Z",
  },
  {
    id: "demo-apex-fitness",
    name: "Apex Fitness",
    fb_ad_account_id: "act_100000000000003",
    ghl_location_id: "loc_apex",
    target_cpl: 20,
    target_cost_per_booking: 90,
    monthly_budget: 4000,
    notes: null,
    active: true,
    created_at: "2026-01-10T00:00:00Z",
    updated_at: "2026-04-15T00:00:00Z",
  },
  {
    id: "demo-sunset-realty",
    name: "Sunset Realty",
    fb_ad_account_id: "act_100000000000004",
    ghl_location_id: "loc_sunset",
    target_cpl: 45,
    target_cost_per_booking: 250,
    monthly_budget: 12000,
    notes: null,
    active: true,
    created_at: "2025-11-01T00:00:00Z",
    updated_at: "2026-04-15T00:00:00Z",
  },
  {
    id: "demo-urban-coffee",
    name: "Urban Coffee Co",
    fb_ad_account_id: "act_100000000000005",
    ghl_location_id: "loc_urban",
    target_cpl: 15,
    target_cost_per_booking: 60,
    monthly_budget: 3000,
    notes: null,
    active: true,
    created_at: "2025-12-01T00:00:00Z",
    updated_at: "2026-04-15T00:00:00Z",
  },
];

// Deterministic pseudo-random so builds are reproducible and charts don't
// re-shuffle on every render.
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function dateNDaysAgo(n: number, base = new Date("2026-04-15T00:00:00Z")): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

interface Profile {
  base_spend: number;       // ~daily spend target
  base_leads: number;       // ~daily leads target
  booking_rate: number;     // baseline leads -> bookings
  ctr: number;              // baseline CTR
  frequency: number;        // baseline frequency
  // Perturbations in the last 7 days to create realistic issues:
  recent_multiplier_spend?: number;
  recent_multiplier_leads?: number;
  recent_booking_rate?: number;
  recent_frequency?: number;
  recent_ctr_mult?: number;
  seed: number;
}

const PROFILES: Record<string, Profile> = {
  "demo-bright-dental": {
    base_spend: 180,
    base_leads: 9,
    booking_rate: 0.35,
    ctr: 0.021,
    frequency: 1.8,
    seed: 11,
  },
  "demo-metro-medspa": {
    // cost per booking blown out in the last 7 days
    base_spend: 260,
    base_leads: 7,
    booking_rate: 0.28,
    ctr: 0.018,
    frequency: 2.1,
    recent_multiplier_spend: 1.4,
    recent_booking_rate: 0.18,
    seed: 22,
  },
  "demo-apex-fitness": {
    // hardly any leads at all the last few days
    base_spend: 120,
    base_leads: 5,
    booking_rate: 0.4,
    ctr: 0.019,
    frequency: 2.4,
    recent_multiplier_leads: 0.15,
    seed: 33,
  },
  "demo-sunset-realty": {
    // conversion rate collapsed (leads ok, bookings not)
    base_spend: 360,
    base_leads: 9,
    booking_rate: 0.22,
    ctr: 0.014,
    frequency: 2.6,
    recent_booking_rate: 0.09,
    seed: 44,
  },
  "demo-urban-coffee": {
    // ad fatigue — frequency high, CTR dropping
    base_spend: 95,
    base_leads: 8,
    booking_rate: 0.3,
    ctr: 0.023,
    frequency: 2.0,
    recent_frequency: 4.1,
    recent_ctr_mult: 0.5,
    seed: 55,
  },
};

function generateKpisForClient(clientId: string): DailyKpi[] {
  const profile = PROFILES[clientId];
  if (!profile) return [];
  const rand = seeded(profile.seed);
  const out: DailyKpi[] = [];

  for (let i = 29; i >= 0; i--) {
    const date = dateNDaysAgo(i);
    const isRecent = i < 7;

    const spendJitter = 0.8 + rand() * 0.4;
    const leadsJitter = 0.7 + rand() * 0.6;

    const spend =
      profile.base_spend *
      spendJitter *
      (isRecent && profile.recent_multiplier_spend
        ? profile.recent_multiplier_spend
        : 1);

    const leads = Math.max(
      0,
      Math.round(
        profile.base_leads *
          leadsJitter *
          (isRecent && profile.recent_multiplier_leads
            ? profile.recent_multiplier_leads
            : 1)
      )
    );

    const bookingRate =
      isRecent && profile.recent_booking_rate
        ? profile.recent_booking_rate
        : profile.booking_rate;
    const bookings = Math.round(leads * bookingRate);
    const shows = Math.round(bookings * 0.7);
    const sales = Math.round(shows * 0.35);

    const ctr =
      profile.ctr *
      (isRecent && profile.recent_ctr_mult ? profile.recent_ctr_mult : 1);
    const frequency =
      isRecent && profile.recent_frequency
        ? profile.recent_frequency
        : profile.frequency;
    const impressions = Math.round(spend / 0.015);
    const clicks = Math.round(impressions * ctr);

    out.push({
      client_id: clientId,
      date,
      spend: Number(spend.toFixed(2)),
      impressions,
      clicks,
      ctr: Number(ctr.toFixed(4)),
      frequency: Number(frequency.toFixed(2)),
      leads,
      bookings,
      shows,
      sales,
      cost_per_lead: leads > 0 ? Number((spend / leads).toFixed(2)) : null,
      cost_per_booking:
        bookings > 0 ? Number((spend / bookings).toFixed(2)) : null,
      booking_rate: leads > 0 ? Number((bookings / leads).toFixed(4)) : null,
      show_rate: bookings > 0 ? Number((shows / bookings).toFixed(4)) : null,
      updated_at: new Date().toISOString(),
    });
  }
  return out;
}

export const DEMO_KPIS: DailyKpi[] = DEMO_CLIENTS.flatMap((c) =>
  generateKpisForClient(c.id)
);

// ------------------------------------------------------------------
// Fake flags — one for each client (except Bright Dental, which is healthy).
// ------------------------------------------------------------------
export const DEMO_FLAGS: Flag[] = [
  {
    id: "flag-1",
    client_id: "demo-metro-medspa",
    flag_type: "cpb_over_target",
    severity: "high",
    detected_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    resolved_at: null,
    metrics: { cpb_7d: 214.8, target_cpb: 150 },
    diagnosis_md:
      "7-day cost per booking $214.80 exceeds target $150.00 by more than 20%.",
  },
  {
    id: "flag-2",
    client_id: "demo-apex-fitness",
    flag_type: "low_volume",
    severity: "high",
    detected_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    resolved_at: null,
    metrics: { leads_3d: 2, spend_3d: 412 },
    diagnosis_md: "Only 2 leads in the last 3 days (threshold: 3).",
  },
  {
    id: "flag-3",
    client_id: "demo-sunset-realty",
    flag_type: "conversion_rate_drop",
    severity: "medium",
    detected_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    resolved_at: null,
    metrics: { booking_rate_7d: 0.09, booking_rate_baseline: 0.22 },
    diagnosis_md:
      "7-day lead-to-booking rate 9.0% is under 70% of the 30-day baseline 22.0%.",
  },
  {
    id: "flag-4",
    client_id: "demo-urban-coffee",
    flag_type: "ad_fatigue",
    severity: "low",
    detected_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    resolved_at: null,
    metrics: { frequency_7d: 4.1, ctr_7d: 0.011, ctr_30d: 0.021 },
    diagnosis_md:
      "7-day CTR has dropped below 60% of the 30-day CTR and frequency is 4.1.",
  },
];

// ------------------------------------------------------------------
// Fake report (for /dashboard/reports listing)
// ------------------------------------------------------------------
export const DEMO_REPORTS: Report[] = [
  {
    id: "demo-report-1",
    client_id: "demo-metro-medspa",
    window: "7d",
    share_token: "demo-metro-7d",
    generated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    payload: {
      client: {
        id: "demo-metro-medspa",
        name: "Metro Med Spa",
        target_cpl: 30,
        target_cost_per_booking: 150,
      },
    },
    ai_summary_md: DEMO_AI_SUMMARY(),
  },
];

export function DEMO_AI_SUMMARY(): string {
  return `## Diagnosis
Cost per booking has climbed to $214.80 over the past 7 days — 43% above the $150 target — driven almost entirely by a collapse in the lead-to-booking rate from 28% to 18%.

## Root causes
- **Funnel**: lead-to-booking rate dropped 10 points in 7 days with no change in lead volume, suggesting the booking step (not the ad) is breaking.
- **Offer**: the \"free consult\" headline is >45 days old; competitors in the same geo launched a $49 first-visit offer last week.
- **Creative**: frequency on the top-spending adset hit 2.4 — not fatigued yet, but approaching the threshold.

## Recommended actions
1. Audit the GHL booking workflow today — check for broken SMS/email automations between lead capture and confirmed appointment.
2. Launch a $49 first-visit offer as a new ad variant within 24 hours to reclaim competitive position.
3. Refresh two top-spending ad creatives with new hooks before frequency crosses 3.5.
4. Pause the worst-performing adset (CPL >$45) and reallocate the budget to the top two performers.
5. Re-check metrics in 72 hours; if booking rate hasn't recovered to 25%+, escalate to a funnel teardown call with the client.`;
}
