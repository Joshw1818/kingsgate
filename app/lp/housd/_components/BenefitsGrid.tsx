const benefits = [
  {
    stat: "100,000+",
    label: "Vetted properties",
    body: "Serviced apartments, houses and mansions across the UK — ideal for 7+ night stays.",
  },
  {
    stat: "~25%",
    label: "Average saving",
    body: "Fixed project rates negotiated directly. No surge pricing, no platform fees.",
  },
  {
    stat: "2 hrs",
    label: "Quote SLA",
    body: "Send requirements, get sourced options within two working hours — often sooner.",
  },
  {
    stat: "1:1",
    label: "Account manager",
    body: "A single point of contact handles 100% of your requests, from source to check-out.",
  },
];

export function BenefitsGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {benefits.map((b) => (
        <div
          key={b.label}
          className="rounded-xl border border-housd-line bg-white p-6"
        >
          <div className="font-housd text-3xl text-housd-accent">{b.stat}</div>
          <div className="mt-1 text-sm font-semibold uppercase tracking-wide text-housd-ink">
            {b.label}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{b.body}</p>
        </div>
      ))}
    </div>
  );
}
