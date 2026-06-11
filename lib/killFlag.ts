// killFlag.ts
// Kingsgate — ad-set flag logic for the morning KPI scan.
// Pure and dependency-free so it drops straight into the dashboard.
// It NEVER writes anything: feed it ad-set metrics from dataSources.ts and it
// returns a computed flag the UI renders. (Read-only derived state — consistent
// with "all reads through dataSources.ts, user edits only to overrides".)
//
// The whole KPI table is derived, not hardcoded:
//   max cost per booking = offerValue / roasTarget
//   max cost per lead     = maxCPB * assumedCvr            (Josh's table assumes 0.40)
//   kill line             = killMultiple * (5x max CPL)    (Josh's rule = 2, pegged to the 5x row)

export type Flag = "green" | "watch" | "warn" | "kill" | "learning";

export interface AdSetMetrics {
  /** Ad set or ad name, for display (e.g. "Diamond — 3/6 | 3 for £120"). */
  name: string;
  /** The "3 carpets for £X" order value this ad set runs: 99 / 120 / 150 or custom. */
  offerValue: number;
  /** The client's ROAS goal for this account: 5, 7, 10 or custom. */
  roasTarget: number;
  /** Spend over the evaluation window (today by default; pass trailing if you scan over N days). */
  spend: number;
  /** Leads over the same window. */
  leads: number;
  /** Optional — bookings over the window, where the client actually tracks them. */
  bookings?: number;
  /** Optional — revenue over the window, where tracked. */
  revenue?: number;
  /** Optional fatigue input — trailing daily CPL, oldest -> newest (e.g. last 3 days). */
  cplTrend?: number[];
  /** Optional fatigue input — trailing daily frequency, oldest -> newest. */
  frequencyTrend?: number[];
}

export interface FlagConfig {
  /** Lead -> booking CVR baked into the CPL maxes. Josh's table assumes 0.40. */
  assumedCvr: number;
  /** Kill line = killMultiple x (5x max CPL). Josh's rule = 2. */
  killMultiple: number;
  /** Don't hard-KILL on fewer than this many leads (avoids killing on a single fluke lead). */
  minLeadsForKill: number;
  /** Consecutive days of BOTH rising CPL and rising frequency needed to flag fatigue. */
  fatigueDays: number;
}

export const DEFAULT_CONFIG: FlagConfig = {
  assumedCvr: 0.4,
  killMultiple: 2,
  minLeadsForKill: 2,
  fatigueDays: 3,
};

export interface FlagResult {
  name: string;
  flag: Flag;
  /** Fatigue overlay — can be true on ANY flag, including green. */
  fatigue: boolean;
  cpl: number | null;
  cpb: number | null;
  roas: number | null;
  /** Max CPL at the client's ROAS target — the "goal" line. */
  targetCpl: number;
  /** Max CPL at 5x — the profitability floor. */
  floorCpl: number;
  /** The hard kill line. */
  killCpl: number;
  /** Plain-English why, for the dashboard tooltip / SOP. */
  reason: string;
  /** What the VA should do. */
  action: string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Max cost per booking for a given offer + ROAS target. */
export function maxCpb(offerValue: number, roasTarget: number): number {
  return offerValue / roasTarget;
}

/** Max cost per lead = max CPB x assumed lead->booking CVR. */
export function maxCpl(offerValue: number, roasTarget: number, cvr: number): number {
  return maxCpb(offerValue, roasTarget) * cvr;
}

/** True only if every step in the series is strictly higher than the last. */
function isRising(series: number[]): boolean {
  if (series.length < 2) return false;
  for (let i = 1; i < series.length; i++) {
    if (series[i] <= series[i - 1]) return false;
  }
  return true;
}

/**
 * Evaluate one ad set against Kingsgate's rules.
 * CPL is the primary signal (works for every client, even those who don't log bookings).
 * CPB / ROAS are surfaced where the data exists but do NOT drive the kill decision,
 * so behaviour stays consistent across clients with and without booking tracking.
 */
export function evaluateAdSet(m: AdSetMetrics, config: Partial<FlagConfig> = {}): FlagResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const targetCpl = round2(maxCpl(m.offerValue, m.roasTarget, cfg.assumedCvr));
  const floorCpl = round2(maxCpl(m.offerValue, 5, cfg.assumedCvr)); // always the 5x row
  const killCpl = round2(floorCpl * cfg.killMultiple);

  const cpl = m.leads > 0 ? round2(m.spend / m.leads) : null;
  const cpb = m.bookings && m.bookings > 0 ? round2(m.spend / m.bookings) : null;
  const roas = m.revenue && m.spend > 0 ? round2(m.revenue / m.spend) : null;

  const fatigue =
    !!m.cplTrend &&
    !!m.frequencyTrend &&
    m.cplTrend.length >= cfg.fatigueDays &&
    m.frequencyTrend.length >= cfg.fatigueDays &&
    isRising(m.cplTrend.slice(-cfg.fatigueDays)) &&
    isRising(m.frequencyTrend.slice(-cfg.fatigueDays));

  const base = { name: m.name, fatigue, cpl, cpb, roas, targetCpl, floorCpl, killCpl };

  // Zero leads + spent a full kill-line's worth = kill (no leads for that budget is its own signal).
  if (m.leads === 0 && m.spend >= killCpl) {
    return {
      ...base,
      flag: "kill",
      reason: `£${round2(m.spend)} spent, zero leads (≥ kill line £${killCpl}).`,
      action: "Kill it. Duplicate a winner or launch a fresh ad, same offer.",
    };
  }

  // Zero leads + little spend = not enough signal yet.
  if (m.leads === 0) {
    return {
      ...base,
      flag: "learning",
      reason: `£${round2(m.spend)} spent, no leads yet (below kill line £${killCpl}).`,
      action: "Leave running. Re-check at the next scan.",
    };
  }

  // From here cpl is a number.
  const c = cpl as number;
  let flag: Flag;
  let reason: string;
  let action: string;

  if (c >= killCpl) {
    if (m.leads < cfg.minLeadsForKill) {
      flag = "warn";
      reason = `CPL £${c} is over the kill line but only ${m.leads} lead so far — could be noise.`;
      action = `Hold this scan. If CPL stays above £${killCpl} with another lead, kill and replace.`;
    } else {
      flag = "kill";
      reason = `CPL £${c} ≥ kill line £${killCpl} (2× the 5x max £${floorCpl}).`;
      action = "Kill the ad set / creative, then duplicate a winner or launch fresh, same offer.";
    }
  } else if (c > floorCpl) {
    flag = "warn";
    reason = `CPL £${c} above the 5x floor £${floorCpl} — below minimum ROAS.`;
    action = `Watch through the day. If it climbs toward £${killCpl}, duplicate or refresh before it tips.`;
  } else if (c > targetCpl) {
    flag = "watch";
    reason = `CPL £${c} above target £${targetCpl} but still inside the 5x floor £${floorCpl}.`;
    action = "Profitable, just under goal. Leave it; review tomorrow.";
  } else {
    flag = "green";
    reason = `CPL £${c} at or under target £${targetCpl}.`;
    action = "Within KPI. No action.";
  }

  // Fatigue overlay: nudge a proactive refresh even when the absolute CPL is fine.
  if (fatigue && (flag === "green" || flag === "watch")) {
    action = "CPL still OK but fatigue building (CPL + frequency rising) — queue a fresh creative now.";
  }

  return { ...base, flag, reason, action };
}

const SEVERITY: Record<Flag, number> = { kill: 0, warn: 1, watch: 2, learning: 3, green: 4 };

/**
 * Evaluate a whole account and return the ad sets pre-sorted worst-first,
 * so the dashboard can render the morning list top-down. Fatigue bumps an
 * item half a tier up its priority.
 */
export function evaluateAccount(adSets: AdSetMetrics[], config?: Partial<FlagConfig>): FlagResult[] {
  return adSets
    .map((a) => evaluateAdSet(a, config))
    .sort((x, y) => {
      const sx = SEVERITY[x.flag] - (x.fatigue ? 0.5 : 0);
      const sy = SEVERITY[y.flag] - (y.fatigue ? 0.5 : 0);
      return sx - sy;
    });
}

/**
 * The KPI reference matrix (the table from the doc), computed.
 * Handy for a dashboard reference panel or to validate against the original table.
 */
export function referenceMatrix(
  offers: number[] = [99, 120, 150],
  targets: number[] = [5, 7, 10],
  cvr: number = DEFAULT_CONFIG.assumedCvr,
  killMultiple: number = DEFAULT_CONFIG.killMultiple,
) {
  return offers.flatMap((offer) =>
    targets.map((t) => ({
      offer,
      roasTarget: t,
      maxCpb: round2(maxCpb(offer, t)),
      maxCpl: round2(maxCpl(offer, t, cvr)),
      killCpl: round2(maxCpl(offer, 5, cvr) * killMultiple),
    })),
  );
}
