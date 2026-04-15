import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import type { KpiAggregate } from "@/lib/kpis";

interface KpiCardsProps {
  agg: KpiAggregate;
  label?: string;
}

export function KpiCards({ agg, label }: KpiCardsProps) {
  const cards = [
    { label: "Spend", value: formatCurrency(agg.spend) },
    { label: "Leads", value: formatNumber(agg.leads) },
    { label: "Bookings", value: formatNumber(agg.bookings) },
    { label: "Cost / Lead", value: formatCurrency(agg.cost_per_lead) },
    { label: "Cost / Booking", value: formatCurrency(agg.cost_per_booking) },
    { label: "Booking Rate", value: formatPercent(agg.booking_rate) },
  ];

  return (
    <section>
      {label && (
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
          {label}
        </h2>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-lg border border-slate-200 px-4 py-3"
          >
            <div className="text-xs text-slate-500">{c.label}</div>
            <div className="text-lg font-semibold text-brand mt-1">
              {c.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
