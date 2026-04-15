import type {
  Client,
  DailyKpi,
  FlagSeverity,
  FlagType,
} from "./supabase/types";
import { aggregateKpis } from "./kpis";

export interface FlagEvaluation {
  flag_type: FlagType;
  severity: FlagSeverity;
  metrics: Record<string, number | string | null>;
  description: string;
}

/**
 * Pure evaluator: given a client and windows of daily KPIs, return all
 * flags that should currently be active. Shared between the Next.js app
 * and the Supabase edge function so the rules stay in one place.
 */
export function evaluateFlags(
  client: Client,
  kpis30d: DailyKpi[]
): FlagEvaluation[] {
  const flags: FlagEvaluation[] = [];
  if (kpis30d.length === 0) return flags;

  const sorted = [...kpis30d].sort((a, b) => a.date.localeCompare(b.date));
  const last3 = sorted.slice(-3);
  const last7 = sorted.slice(-7);
  const prior23 = sorted.slice(0, Math.max(0, sorted.length - 7));

  const agg3 = aggregateKpis(last3);
  const agg7 = aggregateKpis(last7);
  const agg30 = aggregateKpis(sorted);
  const aggBaseline = aggregateKpis(prior23);

  // 1. Low volume — fewer than 3 leads in rolling 3 days
  if (agg3.leads < 3) {
    flags.push({
      flag_type: "low_volume",
      severity: "high",
      metrics: {
        leads_3d: agg3.leads,
        spend_3d: agg3.spend,
      },
      description: `Only ${agg3.leads} leads in the last 3 days (threshold: 3).`,
    });
  }

  // 2. CPL over target (+20%)
  if (
    client.target_cpl != null &&
    agg3.cost_per_lead != null &&
    agg3.cost_per_lead > client.target_cpl * 1.2
  ) {
    flags.push({
      flag_type: "cpl_over_target",
      severity: "medium",
      metrics: {
        cpl_3d: agg3.cost_per_lead,
        target_cpl: client.target_cpl,
      },
      description: `3-day CPL $${agg3.cost_per_lead.toFixed(
        2
      )} exceeds target $${client.target_cpl.toFixed(2)} by more than 20%.`,
    });
  }

  // 3. Cost per booking over target (+20%) — 7 day window
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
      description: `7-day cost per booking $${agg7.cost_per_booking.toFixed(
        2
      )} exceeds target $${client.target_cost_per_booking.toFixed(
        2
      )} by more than 20%.`,
    });
  }

  // 4. Conversion rate drop — 7d booking_rate < 70% of 30d baseline
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
      description: `7-day lead-to-booking rate ${(
        agg7.booking_rate * 100
      ).toFixed(1)}% is under 70% of the 30-day baseline ${(
        aggBaseline.booking_rate * 100
      ).toFixed(1)}%.`,
    });
  }

  // 5. Ad fatigue — frequency > 3.5 OR 7d CTR < 60% of 30d CTR
  const avgFrequency =
    last7.reduce((s, r) => s + Number(r.frequency ?? 0), 0) /
    Math.max(1, last7.length);
  const ctr7 = agg7.ctr;
  const ctr30 = agg30.ctr;
  const ctrDropped =
    ctr7 != null && ctr30 != null && ctr30 > 0 && ctr7 < ctr30 * 0.6;
  if (avgFrequency > 3.5 || ctrDropped) {
    flags.push({
      flag_type: "ad_fatigue",
      severity: "low",
      metrics: {
        frequency_7d: avgFrequency,
        ctr_7d: ctr7,
        ctr_30d: ctr30,
      },
      description: ctrDropped
        ? `7-day CTR has dropped below 60% of the 30-day CTR.`
        : `Average 7-day frequency is ${avgFrequency.toFixed(
            2
          )} (>3.5). Audience likely fatigued.`,
    });
  }

  return flags;
}

export const FLAG_LABELS: Record<FlagType, string> = {
  low_volume: "Low lead volume",
  cpl_over_target: "CPL over target",
  cpb_over_target: "Cost per booking over target",
  conversion_rate_drop: "Conversion rate drop",
  ad_fatigue: "Ad fatigue",
};

export const SEVERITY_ORDER: Record<FlagSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};
