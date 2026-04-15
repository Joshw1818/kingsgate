import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Client, DailyKpi, Flag } from "@/lib/supabase/types";
import { aggregateKpis, dateNDaysAgo } from "@/lib/kpis";
import { SEVERITY_ORDER } from "@/lib/flags";
import { KpiCards } from "@/components/KpiCards";
import { FlagBadge } from "@/components/FlagBadge";
import { SpendLeadsChart, type ChartPoint } from "@/components/charts/SpendLeadsChart";
import { AnalyzeButton } from "@/components/AnalyzeButton";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const since = dateNDaysAgo(30);

  const [clientRes, kpisRes, flagsRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase
      .from("daily_kpis")
      .select("*")
      .eq("client_id", id)
      .gte("date", since)
      .order("date"),
    supabase
      .from("flags")
      .select("*")
      .eq("client_id", id)
      .is("resolved_at", null),
  ]);

  if (!clientRes.data) notFound();
  const client = clientRes.data as Client;
  const kpis = (kpisRes.data ?? []) as DailyKpi[];
  const flags = ((flagsRes.data ?? []) as Flag[]).sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
  );

  const agg30 = aggregateKpis(kpis);
  const agg7 = aggregateKpis(kpis.filter((r) => r.date >= dateNDaysAgo(7)));

  const chartData: ChartPoint[] = kpis.map((r) => ({
    date: r.date.slice(5),
    spend: Number(r.spend ?? 0),
    leads: Number(r.leads ?? 0),
    bookings: Number(r.bookings ?? 0),
  }));

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="text-xs text-slate-500 hover:underline"
        >
          ← Back to overview
        </Link>
        <div className="flex items-end justify-between mt-2">
          <div>
            <h1 className="text-2xl font-semibold text-brand">{client.name}</h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">
              {client.fb_ad_account_id} · GHL {client.ghl_location_id}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 space-y-0.5">
            {client.target_cpl && (
              <div>Target CPL: {formatCurrency(client.target_cpl)}</div>
            )}
            {client.target_cost_per_booking && (
              <div>
                Target CPB: {formatCurrency(client.target_cost_per_booking)}
              </div>
            )}
          </div>
        </div>
      </div>

      <KpiCards agg={agg7} label="Last 7 days" />
      <KpiCards agg={agg30} label="Last 30 days" />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-slate-700">
          Spend vs leads vs bookings (30d)
        </h2>
        <SpendLeadsChart data={chartData} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-700">Active flags</h2>
        {flags.length === 0 ? (
          <p className="text-sm text-slate-400">No active flags.</p>
        ) : (
          <div className="space-y-2">
            {flags.map((f) => (
              <div
                key={f.id}
                className="bg-white border border-slate-200 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <FlagBadge flagType={f.flag_type} severity={f.severity} />
                  <span className="text-xs text-slate-400">
                    {new Date(f.detected_at).toLocaleString()}
                  </span>
                </div>
                {f.diagnosis_md && (
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">
                    {f.diagnosis_md}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-700">
          AI analysis & recommendations
        </h2>
        <AnalyzeButton clientId={client.id} window="7d" />
      </section>
    </div>
  );
}
