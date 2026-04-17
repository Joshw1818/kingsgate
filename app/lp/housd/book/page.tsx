import Link from "next/link";

export default function HousdBookPage() {
  const bookingUrl = process.env.NEXT_PUBLIC_HOUSD_BOOKING_URL;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <div className="text-center">
        <span className="inline-flex items-center rounded-full bg-housd-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-housd-accentDark">
          Step 2 of 2 — lock it in
        </span>
        <h1 className="mt-4 font-housd text-3xl leading-tight tracking-tight text-housd-ink sm:text-5xl">
          You're qualified. Pick a time — your account manager will confirm
          your quote on the call.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-700">
          We hold your sourcing slot the moment you book. Most calls are 15
          minutes and end with a shortlist hitting your inbox the same day.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        <aside className="space-y-5 lg:col-span-2">
          <div className="rounded-xl border border-housd-line bg-white p-6">
            <h2 className="font-housd text-xl text-housd-ink">
              Why book now?
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="flex gap-3">
                <Dot />
                Lock in fixed project rates — protected from surge pricing for
                the duration.
              </li>
              <li className="flex gap-3">
                <Dot />
                Your 2-hour sourcing SLA starts the moment the call ends.
              </li>
              <li className="flex gap-3">
                <Dot />
                Priority sourcing bonus for callers who book within 24 hours.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-housd-line bg-housd-cream p-6 text-sm leading-relaxed text-slate-700">
            <h3 className="font-semibold text-housd-ink">
              Before you book — quick commitment
            </h3>
            <p className="mt-2">
              By booking you're committing to showing up and taking the next
              step. <strong>We don't offer reschedules</strong> — if the time
              doesn't work, please don't book it. Missed calls can't be
              rebooked.
            </p>
          </div>

          <div className="rounded-xl border border-housd-line bg-white p-6 text-sm text-slate-600">
            <h3 className="font-semibold text-housd-ink">Need us sooner?</h3>
            <p className="mt-2">
              Call{" "}
              <a
                href="tel:+441234567890"
                className="font-semibold text-housd-accent hover:text-housd-accentDark"
              >
                +44 1234 567890
              </a>{" "}
              or email{" "}
              <a
                href="mailto:hello@housd.co.uk"
                className="font-semibold text-housd-accent hover:text-housd-accentDark"
              >
                hello@housd.co.uk
              </a>
              . UK business hours, Mon–Fri.
            </p>
          </div>
        </aside>

        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-xl border border-housd-line bg-white">
            {bookingUrl ? (
              <iframe
                src={bookingUrl}
                title="Book a call with your Housd account manager"
                className="h-[780px] w-full"
                loading="lazy"
              />
            ) : (
              <div className="flex h-[500px] flex-col items-center justify-center p-8 text-center">
                <p className="font-housd text-xl text-housd-ink">
                  Thanks — we've got your details.
                </p>
                <p className="mt-3 max-w-md text-sm text-slate-600">
                  Your account manager will be in touch within the next 2
                  working hours to confirm your quote. No need to wait — you
                  can reach us on the contact details to the left.
                </p>
                <Link
                  href="/lp/housd/thanks"
                  className="mt-6 rounded-md bg-housd-accent px-5 py-3 text-sm font-semibold text-white hover:bg-housd-accentDark"
                >
                  Continue
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Dot() {
  return (
    <span
      aria-hidden
      className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-housd-accent"
    />
  );
}
