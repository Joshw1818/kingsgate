import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Client, DailyKpi, Flag } from "@/lib/supabase/types";
import { aggregateKpis, dateNDaysAgo, healthScore } from "@/lib/kpis";
import { SEVERITY_ORDER } from "@/lib/flags";
import { KpiCards } from "@/components/KpiCards";
import { FlagBadge, HealthDot } from "@/components/FlagBadge";
import { DemoBanner } from "@/components/DemoBanner";
import { isDemoMode, DEMO_CLIENTS, DEMO_KPIS, DEMO_FLAGS } from "@/lib/demo";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const since = dateNDaysAgo(30);

  let clients: Client[];
  let kpis: DailyKpi[];
  let flags: Flag[];

  if (isDemoMode()) {
    clients = DEMO_CLIENTS;
    kpis = DEMO_KPIS;
    flags = DEMO_FLAGS;
  } else {
    const supabase = await createSupabaseServerClient();
    const [clientsRes, kpisRes, flagsRes] = await Promise.all([
      supabase.from("clients").select("*").eq("active", true).order("name"),
      supabase.from("daily_kpis").select("*").gte("date", since),
      supabase.from("flags").select("*").is("resolved_at", null),
    ]);
    clients = (clientsRes.data ?? []) as Client[];
    kpis = (kpisRes.data ?? []) as DailyKpi[];
    flags = (flagsRes.data ?? []) as Flag[];
  }

  const kpisByClient = new Map<string, DailyKpi[]>();
  for (const row of kpis) {
    const arr = kpisByClient.get(row.client_id) ?? [];
    arr.push(row);
    kpisByClient.set(row.client_id, arr);
  }
  const flagsByClient = new Map<string, Flag[]>();
  for (const f of flags) {
    const arr = flagsByClient.get(f.client_id) ?? [];
    arr.push(f);
    flagsByClient.set(f.client_id, arr);
  }

  const rows = clients.map((c) => {
    const clientKpis = kpisByClient.get(c.id) ?? [];
    const last7 = clientKpis
      .filter((r) => r.date >= dateNDaysAgo(7))
      .sort((a, b) => a.date.localeCompare(b.date));
    const agg7 = aggregateKpis(last7);
    const clientFlags = (flagsByClient.get(c.id) ?? []).sort(
      (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
    );
    const health = healthScore(c, agg7);
    return { client: c, agg7, flags: clientFlags, health };
  });

  rows.sort((a, b) => {
    const sa = a.flags[0] ? SEVERITY_ORDER[a.flags[0].severity] : 0;
    const sb = b.flags[0] ? SEVERITY_ORDER[b.flags[0].severity] : 0;
    if (sb !== sa) return sb - sa;
    return a.client.name.localeCompare(b.client.name);
  });

  const agencyAgg = aggregateKpis(
    kpis.filter((r) => r.date >= dateNDaysAgo(7))
  );

  return (
    <div className="space-y-8">
      <DemoBanner />
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand">Agency overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Last 7 days across {clients.length} active client
            {clients.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Link
          href="/dashboard/reports"
          className="text-sm rounded-md bg-brand text-white px-3 py-2 hover:bg-slate-800"
        >
          Reports
        </Link>
      </div>

      <KpiCards agg={agencyAgg} label="Agency · 7-day totals" />

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-slate-700">Clients</h2>
          <Link
            href="/dashboard/clients/new"
            className="text-xs text-brand-accent hover:underline"
          >
            + Add client
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Client</th>
                <th className="text-right px-4 py-2 font-medium">Spend</th>
                <th className="text-right px-4 py-2 font-medium">Leads</th>
                <th className="text-right px-4 py-2 font-medium">Bookings</th>
                <th className="text-right px-4 py-2 font-medium">CPB</th>
                <th className="text-left px-4 py-2 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center text-slate-400 py-8 text-sm"
                  >
                    No clients yet —{" "}
                    <Link
                      href="/dashboard/clients/new"
                      className="text-brand-accent hover:underline"
                    >
                      add your first client
                    </Link>
                    .
                  </td>
                </tr>
              )}
              {rows.map(({ client, agg7, flags, health }) => (
                <tr key={client.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="flex items-center gap-2 font-medium text-brand hover:underline"
                    >
                      <HealthDot label={health.label} />
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(agg7.spend)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatNumber(agg7.leads)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatNumber(agg7.bookings)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(agg7.cost_per_booking)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {flags.length === 0 ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        flags.map((f) => (
                          <FlagBadge
                            key={f.id}
                            flagType={f.flag_type}
                            severity={f.severity}
                          />
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
