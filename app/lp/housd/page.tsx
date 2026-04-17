import Link from "next/link";
import { BenefitsGrid } from "./_components/BenefitsGrid";
import { LeadForm } from "./_components/LeadForm";
import { StickyCTA } from "./_components/StickyCTA";
import { Testimonials } from "./_components/Testimonials";

const steps = [
  {
    n: "01",
    title: "Send your requirements",
    body: "Share locations, dates, headcount and any must-haves in the form — one-and-done.",
  },
  {
    n: "02",
    title: "We source and vet",
    body: "Your account manager returns vetted options within 2 working hours, at pre-negotiated project rates.",
  },
  {
    n: "03",
    title: "Check in — often within days",
    body: "Approve the shortlist, we book it. One invoice, one point of contact, zero admin for your team.",
  },
];

export default function HousdLandingPage() {
  return (
    <main>
      {/* Top bar */}
      <header className="border-b border-housd-line/70 bg-housd-sand/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-housd-ink" aria-hidden />
            <span className="font-housd text-xl tracking-tight text-housd-ink">
              housd
            </span>
          </div>
          <a
            href="tel:+441234567890"
            className="hidden text-sm font-medium text-housd-ink hover:text-housd-accent sm:block"
          >
            Talk to an account manager →
          </a>
        </div>
      </header>

      {/* Hero + form */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-5 lg:gap-14 lg:py-20">
          <div className="lg:col-span-3">
            <span className="inline-flex items-center rounded-full bg-housd-ink/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-housd-navy">
              UK staff &amp; contractor accommodation
            </span>
            <h1 className="mt-5 font-housd text-4xl leading-tight tracking-tight text-housd-ink sm:text-5xl lg:text-6xl">
              UK contractor accommodation,{" "}
              <span className="text-housd-accent">sourced in 2 hours.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-700">
              For ops, procurement and project teams booking stays for
              workforces across the UK. Fixed project rates. Vetted serviced
              apartments &amp; houses. One dedicated account manager who handles
              100% of your requests.
            </p>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-housd-ink">
              <li className="flex items-center gap-2">
                <Tick /> Free quote, no obligation
              </li>
              <li className="flex items-center gap-2">
                <Tick /> No hidden fees
              </li>
              <li className="flex items-center gap-2">
                <Tick /> Fixed rates for the project
              </li>
              <li className="flex items-center gap-2">
                <Tick /> Save ~25% vs booking sites
              </li>
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#lead-form"
                className="inline-flex items-center justify-center rounded-md bg-housd-accent px-6 py-4 text-base font-semibold text-white shadow-md transition hover:bg-housd-accentDark"
              >
                Get my quote in 2 hours
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-md border border-housd-ink/20 px-6 py-4 text-base font-semibold text-housd-ink transition hover:border-housd-ink/40"
              >
                How it works
              </a>
            </div>
          </div>

          <div id="lead-form" className="lg:col-span-2">
            <LeadForm />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-housd-cream py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-housd text-3xl tracking-tight text-housd-ink sm:text-4xl">
              Built for teams who don't have time to chase bookings.
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              We've sourced stays for everything from rural rail projects to
              multi-site construction rollouts. If it exists in the UK, we can
              probably get your team into it.
            </p>
          </div>
          <div className="mt-10">
            <BenefitsGrid />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-housd text-3xl tracking-tight text-housd-ink sm:text-4xl">
              Three steps. Zero paperwork for your team.
            </h2>
          </div>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <li
                key={s.n}
                className="relative rounded-xl border border-housd-line bg-white p-7"
              >
                <div className="font-housd text-5xl leading-none text-housd-accent/70">
                  {s.n}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-housd-ink">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-housd-sand py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-housd text-3xl tracking-tight text-housd-ink sm:text-4xl">
              Clients who stopped chasing hotels.
            </h2>
          </div>
          <div className="mt-10">
            <Testimonials />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-housd-ink py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="font-housd text-3xl tracking-tight sm:text-4xl">
            Tell us what you need. We'll come back within 2 hours.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
            Free quote. No obligation. Fixed rates for the duration of your
            project — protected from surge pricing.
          </p>
          <a
            href="#lead-form"
            className="mt-8 inline-flex items-center justify-center rounded-md bg-housd-accent px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-housd-accentDark"
          >
            Get my quote
          </a>
        </div>
      </section>

      <footer className="border-t border-housd-line bg-housd-sand py-10 text-sm text-slate-600">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center">
          <div>
            <div className="font-housd text-base text-housd-ink">housd</div>
            <div>Staff &amp; contractor accommodation, sourced in 2 hours.</div>
          </div>
          <div className="flex flex-col gap-1 sm:items-end">
            <Link
              href="https://www.housd.co.uk"
              className="hover:text-housd-accent"
            >
              housd.co.uk
            </Link>
            <a
              href="mailto:hello@housd.co.uk"
              className="hover:text-housd-accent"
            >
              hello@housd.co.uk
            </a>
          </div>
        </div>
      </footer>

      <StickyCTA />
    </main>
  );
}

function Tick() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="h-4 w-4 flex-shrink-0 text-housd-accent"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42l2.79 2.79 6.79-6.79a1 1 0 011.42 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
