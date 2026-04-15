import type { Client, DailyKpi, ReportWindow } from "./supabase/types";

export interface KpiAggregate {
  spend: number;
  leads: number;
  bookings: number;
  shows: number;
  sales: number;
  impressions: number;
  clicks: number;
  cost_per_lead: number | null;
  cost_per_booking: number | null;
  booking_rate: number | null;
  ctr: number | null;
  days: number;
}

export function aggregateKpis(rows: DailyKpi[]): KpiAggregate {
  const agg = rows.reduce(
    (acc, r) => {
      acc.spend += Number(r.spend ?? 0);
      acc.leads += Number(r.leads ?? 0);
      acc.bookings += Number(r.bookings ?? 0);
      acc.shows += Number(r.shows ?? 0);
      acc.sales += Number(r.sales ?? 0);
      acc.impressions += Number(r.impressions ?? 0);
      acc.clicks += Number(r.clicks ?? 0);
      return acc;
    },
    {
      spend: 0,
      leads: 0,
      bookings: 0,
      shows: 0,
      sales: 0,
      impressions: 0,
      clicks: 0,
    }
  );

  return {
    ...agg,
    cost_per_lead: agg.leads > 0 ? agg.spend / agg.leads : null,
    cost_per_booking: agg.bookings > 0 ? agg.spend / agg.bookings : null,
    booking_rate: agg.leads > 0 ? agg.bookings / agg.leads : null,
    ctr: agg.impressions > 0 ? agg.clicks / agg.impressions : null,
    days: rows.length,
  };
}

export function windowDays(w: ReportWindow): number {
  return w === "7d" ? 7 : 30;
}

export function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface HealthScore {
  score: number; // 0-100
  label: "healthy" | "watch" | "critical";
}

export function healthScore(
  client: Client,
  agg: KpiAggregate
): HealthScore {
  let score = 100;
  if (agg.leads < 3) score -= 40;
  if (client.target_cpl && agg.cost_per_lead && agg.cost_per_lead > client.target_cpl * 1.2) {
    score -= 20;
  }
  if (
    client.target_cost_per_booking &&
    agg.cost_per_booking &&
    agg.cost_per_booking > client.target_cost_per_booking * 1.2
  ) {
    score -= 30;
  }
  if (agg.booking_rate !== null && agg.booking_rate < 0.1) score -= 15;

  score = Math.max(0, score);
  const label: HealthScore["label"] =
    score >= 75 ? "healthy" : score >= 50 ? "watch" : "critical";
  return { score, label };
}
