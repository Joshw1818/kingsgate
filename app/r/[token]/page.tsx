import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Report } from "@/lib/supabase/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { SpendLeadsChart, type ChartPoint } from "@/components/charts/SpendLeadsChart";
import type { KpiAggregate } from "@/lib/kpis";

export const dynamic = "force-dynamic";

interface ReportPayload {
  client: {
    id: string;
    name: string;
    target_cpl: number | null;
    target_cost_per_booking: number | null;
  };
  totals: KpiAggregate;
  daily: Array<{
    date: string;
    spend: number;
    leads: number;
    bookings: number;
  }>;
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Public view: use service role to bypass RLS, keyed ONLY on share_token.
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("reports")
    .select("*")
    .eq("share_token", token)
    .single();

  if (!data) notFound();
  const report = data as Report;
  const payload = report.payload as unknown as ReportPayload;

  const chartData: ChartPoint[] = payload.daily.map((d) => ({
    date: d.date.slice(5),
    spend: d.spend,
    leads: d.leads,
    bookings: d.bookings,
  }));

  const cards = [
    { label: "Spend", value: formatCurrency(payload.totals.spend) },
    { label: "Leads", value: formatNumber(payload.totals.leads) },
    { label: "Bookings", value: formatNumber(payload.totals.bookings) },
    {
      label: "Cost / Lead",
      value: formatCurrency(payload.totals.cost_per_lead),
    },
    {
      label: "Cost / Booking",
      value: formatCurrency(payload.totals.cost_per_booking),
    },
    {
      label: "Booking Rate",
      value: formatPercent(payload.totals.booking_rate),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="bg-brand text-white rounded-xl p-6">
          <div className="text-xs uppercase tracking-wide opacity-70">
            Kingsgate Agency · Performance report
          </div>
          <h1 className="text-2xl font-semibold mt-1">{payload.client.name}</h1>
          <div className="text-sm opacity-80 mt-1">
            {report.window} window · generated{" "}
            {new Date(report.generated_at).toLocaleDateString()}
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map((c) => (
            <div
              key={c.label}
              className="bg-white rounded-lg border border-slate-200 p-4"
            >
              <div className="text-xs text-slate-500">{c.label}</div>
              <div className="text-xl font-semibold text-brand mt-1">
                {c.value}
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-slate-700">
            Daily spend, leads, and bookings
          </h2>
          <SpendLeadsChart data={chartData} />
        </section>

        {report.ai_summary_md && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-slate-700">
              Analysis & recommendations
            </h2>
            <div className="bg-white border border-slate-200 rounded-lg p-6 whitespace-pre-wrap text-sm leading-relaxed">
              {report.ai_summary_md}
            </div>
          </section>
        )}

        <footer className="text-center text-xs text-slate-400 pt-4">
          © {new Date().getFullYear()} Kingsgate Agency
        </footer>
      </div>
    </div>
  );
}
