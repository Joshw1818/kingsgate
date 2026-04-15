// Demo mode — lets you preview the UI without any Supabase / FB / GHL /
// Anthropic credentials. Auto-enabled when NEXT_PUBLIC_SUPABASE_URL is
// unset, or when NEXT_PUBLIC_DEMO_MODE="true" is explicitly set.

import type {
  Client,
  DailyKpi,
  Flag,
  Report,
} from "./supabase/types";
import type { DeepAnalysis } from "./ai/schema";

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

// ------------------------------------------------------------------
// Fake ad-level insights — used in demo mode so the "Top creatives"
// section of the deep analysis has something to render.
// ------------------------------------------------------------------
export interface DemoAdInsight {
  ad_id: string;
  ad_name: string;
  headline: string;
  body_text: string;
  thumbnail_url: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  frequency: number;
  cost_per_lead: number;
}

export const DEMO_AD_INSIGHTS: Record<string, DemoAdInsight[]> = {
  "demo-metro-medspa": [
    {
      ad_id: "ad_a42",
      ad_name: "Laser Facial - Stock Photo v3",
      headline: "Try our new laser facial",
      body_text:
        "Book your first consultation this week. Limited appointments available.",
      thumbnail_url:
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=200",
      spend: 820,
      impressions: 74500,
      clicks: 820,
      ctr: 0.011,
      frequency: 3.1,
      cost_per_lead: 41,
    },
    {
      ad_id: "ad_b17",
      ad_name: "Botox Starter Offer",
      headline: "Look younger in 20 minutes",
      body_text: "First-time clients save 20%. Book a free consult today.",
      thumbnail_url:
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=200",
      spend: 520,
      impressions: 31000,
      clicks: 620,
      ctr: 0.02,
      frequency: 2.2,
      cost_per_lead: 26,
    },
    {
      ad_id: "ad_c88",
      ad_name: "Glow Package - Carousel",
      headline: "Meet the Glow Package",
      body_text: "Facial + HydraDerm + peel, bundled for $299.",
      thumbnail_url:
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200",
      spend: 280,
      impressions: 19500,
      clicks: 390,
      ctr: 0.02,
      frequency: 1.8,
      cost_per_lead: 28,
    },
  ],
  "demo-apex-fitness": [
    {
      ad_id: "ad_fit_01",
      ad_name: "6-Week Transformation",
      headline: "Drop 10 lbs in 6 weeks",
      body_text: "Small-group personal training. First session free.",
      thumbnail_url:
        "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=200",
      spend: 280,
      impressions: 26000,
      clicks: 320,
      ctr: 0.012,
      frequency: 2.8,
      cost_per_lead: 93,
    },
    {
      ad_id: "ad_fit_02",
      ad_name: "Old Member Reactivation",
      headline: "We miss you — come back",
      body_text: "Former members: first month free.",
      thumbnail_url:
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200",
      spend: 132,
      impressions: 14000,
      clicks: 150,
      ctr: 0.011,
      frequency: 2.5,
      cost_per_lead: 132,
    },
  ],
};

// ------------------------------------------------------------------
// Fake structured deep analysis for Metro Med Spa (the headline demo
// client). Must match the Zod DeepAnalysisSchema exactly.
// ------------------------------------------------------------------
export const DEMO_DEEP_ANALYSIS: DeepAnalysis = {
  headline_diagnosis:
    "CPB is $214.80 this week — 43% over the $150 target — driven by a booking-rate collapse from 28% to 18%, not lead volume.",
  severity: "critical",
  root_causes: [
    {
      lever: "funnel",
      hypothesis:
        "GHL booking workflow is leaking between lead capture and confirmed appointment — lead count is healthy but booking conversion has fallen sharply.",
      evidence: [
        {
          metric: "booking_rate_7d",
          value: 0.18,
          context: "baseline 0.28 over the prior 30 days",
        },
        {
          metric: "cost_per_booking_7d",
          value: 214.8,
          context: "target 150",
        },
        {
          metric: "lead_count_7d",
          value: 58,
          context: "in line with 30-day average of 57",
        },
      ],
      confidence: "high",
    },
    {
      lever: "creative",
      hypothesis:
        "Top-spending creative ad_a42 is approaching fatigue and the image (stock photo) is underperforming the rest of the account on CTR.",
      evidence: [
        {
          metric: "ad_a42_frequency",
          value: 3.1,
          context: "threshold 3.5, account avg 2.2",
        },
        {
          metric: "ad_a42_ctr",
          value: 0.011,
          context: "account average 0.018",
        },
      ],
      confidence: "medium",
    },
    {
      lever: "offer",
      hypothesis:
        "A competitor launched a $49 first-visit offer last week; the current 'try our new laser facial' headline has no price anchor and is losing relative appeal.",
      evidence: [
        {
          metric: "cpl_3d",
          value: 34,
          context: "target 30, trending up over last 5 days",
        },
      ],
      confidence: "low",
    },
  ],
  actions: [
    {
      priority: "P0",
      verb: "Audit",
      description:
        "Walk the GHL booking workflow end-to-end today — check SMS/email automations, calendar availability, confirmation step, and lead tag routing.",
      expected_impact:
        "Recover booking rate to 25%+ within 72 hours if the leak is automation-related.",
    },
    {
      priority: "P0",
      verb: "Pause",
      description:
        "Pause ad_a42 once frequency crosses 3.5 or reallocate its $820 weekly budget to ad_b17 which has a 20% higher CTR.",
      expected_impact:
        "Protect CPL from drifting another 10-15% while the booking issue is being fixed.",
      affected_ad_ids: ["ad_a42"],
    },
    {
      priority: "P1",
      verb: "Refresh",
      description:
        "Duplicate ad_a42 with a new hook + UGC-style image (replace the stock photo) and launch at $50/day to test.",
      expected_impact:
        "Delay full creative fatigue by 1-2 weeks and unlock a new higher-CTR variant.",
      affected_ad_ids: ["ad_a42"],
    },
    {
      priority: "P1",
      verb: "Test",
      description:
        "Launch a $49 first-visit offer variant to counter the competitor's recent launch. Run against current control for 7 days.",
      expected_impact:
        "Potentially reclaim 10-15% of lost booking rate if offer is the real driver.",
    },
    {
      priority: "P2",
      verb: "Review",
      description:
        "Re-check all metrics in 72 hours; if booking rate hasn't recovered to 25%+, escalate to a funnel teardown with the client.",
      expected_impact:
        "Catch any second-order issue before it compounds into next week's numbers.",
    },
  ],
  client_narrative: {
    summary:
      "Your ads are still bringing in plenty of leads this week, but fewer of those leads are making it to a booked appointment than usual. We've already spotted a likely reason and have a plan to fix it fast.",
    wins: [
      "Lead volume is strong — 58 new leads this week, in line with the past month.",
      "One of your ads is still outperforming the rest of the account on engagement.",
    ],
    focus_areas: [
      "Some leads are dropping off between showing interest and confirming their appointment — likely an issue in the follow-up automation.",
      "Your top-performing ad is starting to be seen by the same people too often and needs a fresh look.",
    ],
    next_steps: [
      "We're auditing your booking workflow end-to-end today.",
      "We're refreshing the top-performing ad with a new image and hook this week.",
      "We're testing a limited-time first-visit offer to reinforce demand.",
    ],
  },
};

// ------------------------------------------------------------------
// Canned chat follow-ups. Keys are normalised (lowercase, trimmed,
// stripped of punctuation). Matcher does a "contains" check so short
// queries work even if you phrase them loosely.
// ------------------------------------------------------------------
interface ChatResponse {
  keywords: string[];
  response: string;
}

const DEMO_CHAT_RESPONSES: ChatResponse[] = [
  {
    keywords: ["why", "cpb", "cost per booking", "up"],
    response:
      "The spend per booking climbed because **booking rate collapsed from 28% to 18%** while lead volume held flat. You're not getting fewer leads — you're getting the same number but far fewer of them are turning into appointments.\n\nThat points straight at the funnel, not the ads. I'd start with the GHL workflow audit (P0 action) before touching anything in Ads Manager.",
  },
  {
    keywords: ["which", "pause", "worst", "ad"],
    response:
      "**Pause `ad_a42` first.** It's eating $820/week (45% of spend) and its CTR at 1.1% is well below the 1.8% account average, while frequency has crept to 3.1.\n\nReallocate that budget to `ad_b17` — same audience, CTR of 2.0%, frequency still a safe 2.2. You'll likely recover 10-15% of your CPL immediately.",
  },
  {
    keywords: ["budget", "increase", "raise", "more spend"],
    response:
      "I'd **not** increase budget yet. With booking rate down to 18%, every extra dollar is buying proportionally fewer appointments. Fix the funnel first — once booking rate is back above 25%, the current budget will hit its CPB target without any extra spend.\n\nIf the audit clears the funnel and the problem turns out to be genuine demand softening, then yes — scale `ad_b17` by 20% as the first test.",
  },
  {
    keywords: ["creative", "image", "ad_a42", "a42"],
    response:
      "`ad_a42` uses a stock laser-facial photo that reads as generic in the IG feed. Its CTR is 1.1% vs 2.0% for `ad_b17` (which uses a candid first-person shot) — a 45% gap.\n\nThe P1 action is to duplicate `ad_a42` with a UGC-style image and a slightly punchier hook. Don't change the offer or audience yet — isolate the creative variable so you can attribute any lift cleanly.",
  },
  {
    keywords: ["confidence", "sure", "certain"],
    response:
      "The funnel hypothesis is **high confidence** — the pattern (stable leads + dropping booking rate + rising CPB) almost always points at a broken automation or calendar issue.\n\nThe creative hypothesis is **medium** — fatigue is real but wouldn't alone cause a 10-point booking rate drop.\n\nThe offer hypothesis is **low** — I flagged it because a competitor launched a price promotion last week, but CPL is only up 13% which is within normal variance.",
  },
];

export function getDemoChatResponse(question: string): string {
  const normalised = question.toLowerCase().replace(/[^\w\s]/g, " ");
  const scored = DEMO_CHAT_RESPONSES.map((r) => ({
    response: r.response,
    score: r.keywords.filter((k) => normalised.includes(k)).length,
  }));
  scored.sort((a, b) => b.score - a.score);
  if (scored[0] && scored[0].score > 0) return scored[0].response;
  return `This is demo mode, so I'm working from a fixed script. Try asking:\n\n- "Why is CPB up?"\n- "Which ad should I pause?"\n- "Should I increase budget?"\n- "What's wrong with the creative?"\n- "How confident are you?"`;
}

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
