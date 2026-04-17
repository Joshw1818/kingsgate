import Link from "next/link";

export default function HousdThanksPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-housd-accent/15 text-housd-accent">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1 className="mt-6 font-housd text-4xl leading-tight tracking-tight text-housd-ink sm:text-5xl">
        Thanks — your quote request is in.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-slate-700">
        Your dedicated account manager is already on it. Expect a reply with
        vetted options within <strong>2 working hours</strong> (Mon–Fri).
      </p>

      <div className="mt-8 w-full rounded-xl border border-housd-line bg-white p-6 text-left">
        <h2 className="font-housd text-xl text-housd-ink">What happens next</h2>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
          <li>
            <strong>1.</strong> We source 2–3 vetted properties that fit your
            brief and budget.
          </li>
          <li>
            <strong>2.</strong> You get a shortlist with fixed project rates —
            no surprises.
          </li>
          <li>
            <strong>3.</strong> Approve, and we handle the booking, paperwork
            and check-in.
          </li>
        </ol>
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 text-sm text-slate-600">
        <div>
          Need us sooner? Call{" "}
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
          .
        </div>
        <Link
          href="https://www.housd.co.uk"
          className="text-housd-accent hover:text-housd-accentDark"
        >
          Back to housd.co.uk →
        </Link>
      </div>
    </main>
  );
}
