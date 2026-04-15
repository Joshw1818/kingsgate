// Deno mirror of lib/flags.ts. Keep these two files in sync.
// (Kept duplicated to avoid cross-runtime import gymnastics.)

export type FlagSeverity = "low" | "medium" | "high";
export type FlagType =
  | "low_volume"
  | "cpl_over_target"
  | "cpb_over_target"
  | "conversion_rate_drop"
  | "ad_fatigue";

export interface ClientRow {
  id: string;
  name: string;
  target_cpl: number | null;
  target_cost_per_booking: number | null;
}

export interface DailyKpiRow {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  frequency: number;
  leads: number;
  bookings: number;
  shows: number;
  sales: number;
  cost_per_lead: number | null;
  cost_per_booking: number | null;
  booking_rate: number | null;
}

export interface FlagEvaluation {
  flag_type: FlagType;
  severity: FlagSeverity;
  metrics: Record<string, number | string | null>;
  description: string;
}

function agg(rows: DailyKpiRow[]) {
  const totals = rows.reduce(
    (a, r) => {
      a.spend += Number(r.spend ?? 0);
      a.leads += Number(r.leads ?? 0);
      a.bookings += Number(r.bookings ?? 0);
      a.impressions += Number(r.impressions ?? 0);
      a.clicks += Number(r.clicks ?? 0);
      return a;
    },
    { spend: 0, leads: 0, bookings: 0, impressions: 0, clicks: 0 }
  );
  return {
    ...totals,
    cost_per_lead: totals.leads > 0 ? totals.spend / totals.leads : null,
    cost_per_booking:
      totals.bookings > 0 ? totals.spend / totals.bookings : null,
    booking_rate: totals.leads > 0 ? totals.bookings / totals.leads : null,
    ctr: totals.impressions > 0 ? totals.clicks / totals.impressions : null,
  };
}

export function evaluateFlags(
  client: ClientRow,
  kpis30d: DailyKpiRow[]
): FlagEvaluation[] {
  const flags: FlagEvaluation[] = [];
  if (kpis30d.length === 0) return flags;
  const sorted = [...kpis30d].sort((a, b) => a.date.localeCompare(b.date));
  const last3 = sorted.slice(-3);
  const last7 = sorted.slice(-7);
  const prior23 = sorted.slice(0, Math.max(0, sorted.length - 7));

  const agg3 = agg(last3);
  const agg7 = agg(last7);
  const agg30 = agg(sorted);
  const aggBaseline = agg(prior23);

  if (agg3.leads < 3) {
    flags.push({
      flag_type: "low_volume",
      severity: "high",
      metrics: { leads_3d: agg3.leads, spend_3d: agg3.spend },
      description: `Only ${agg3.leads} leads in the last 3 days (threshold: 3).`,
    });
  }

  if (
    client.target_cpl != null &&
    agg3.cost_per_lead != null &&
    agg3.cost_per_lead > client.target_cpl * 1.2
  ) {
    flags.push({
      flag_type: "cpl_over_target",
      severity: "medium",
      metrics: { cpl_3d: agg3.cost_per_lead, target_cpl: client.target_cpl },
      description: `3-day CPL $${agg3.cost_per_lead.toFixed(2)} exceeds target $${client.target_cpl.toFixed(2)} by more than 20%.`,
    });
  }

  if (
    client.target_cost_per_booking != null &&
    agg7.cost_per_booking != null &&
    agg7.cost_per_booking > client.target_cost_per_booking * 1.2
  ) {
    flags.push({
      flag_type: "cpb_over_target",
      severity: "high",
      metrics: {
        cpb_7d: agg7.cost_per_booking,
        target_cpb: client.target_cost_per_booking,
      },
      description: `7-day cost per booking $${agg7.cost_per_booking.toFixed(2)} exceeds target $${client.target_cost_per_booking.toFixed(2)} by more than 20%.`,
    });
  }

  if (
    agg7.booking_rate != null &&
    aggBaseline.booking_rate != null &&
    aggBaseline.booking_rate > 0 &&
    agg7.booking_rate < aggBaseline.booking_rate * 0.7
  ) {
    flags.push({
      flag_type: "conversion_rate_drop",
      severity: "medium",
      metrics: {
        booking_rate_7d: agg7.booking_rate,
        booking_rate_baseline: aggBaseline.booking_rate,
      },
      description: `7-day lead-to-booking rate ${(agg7.booking_rate * 100).toFixed(1)}% is under 70% of the 30-day baseline ${(aggBaseline.booking_rate * 100).toFixed(1)}%.`,
    });
  }

  const avgFrequency =
    last7.reduce((s, r) => s + Number(r.frequency ?? 0), 0) /
    Math.max(1, last7.length);
  const ctrDropped =
    agg7.ctr != null && agg30.ctr != null && agg30.ctr > 0 && agg7.ctr < agg30.ctr * 0.6;
  if (avgFrequency > 3.5 || ctrDropped) {
    flags.push({
      flag_type: "ad_fatigue",
      severity: "low",
      metrics: { frequency_7d: avgFrequency, ctr_7d: agg7.ctr, ctr_30d: agg30.ctr },
      description: ctrDropped
        ? `7-day CTR has dropped below 60% of the 30-day CTR.`
        : `Average 7-day frequency is ${avgFrequency.toFixed(2)} (>3.5). Audience likely fatigued.`,
    });
  }

  return flags;
}
