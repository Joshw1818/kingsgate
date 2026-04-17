"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Please enter your full name"),
  company: z.string().min(1, "Company is required"),
  email: z.string().email("Work email looks invalid"),
  phone: z.string().min(7, "Phone looks too short"),
  location: z.string().min(2, "Where do you need accommodation?"),
  checkIn: z.string().min(1, "Pick a check-in date"),
  nights: z.coerce.number().int().min(1, "At least 1 night"),
  headcount: z.coerce.number().int().min(1, "At least 1 person"),
  notes: z.string().optional(),
});

type Fields = z.infer<typeof schema>;
type Errors = Partial<Record<keyof Fields, string>>;

const fieldBase =
  "w-full rounded-md border border-housd-line bg-white px-4 py-3 text-[15px] text-housd-ink placeholder:text-slate-400 focus:border-housd-accent focus:outline-none focus:ring-2 focus:ring-housd-accent/30";

export function LeadForm({ id = "lead-form" }: { id?: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    setErrors({});

    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd.entries());
    const parsed = schema.safeParse(raw);

    if (!parsed.success) {
      const fieldErrors: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Fields;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/lp/housd/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !json.ok) {
        setServerError(
          "We couldn't submit the form. Please email hello@housd.co.uk and we'll get straight back to you.",
        );
        setSubmitting(false);
        return;
      }
      router.push("/lp/housd/book");
    } catch {
      setServerError(
        "Network error. Please try again, or email hello@housd.co.uk.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form
      id={id}
      onSubmit={onSubmit}
      noValidate
      className="space-y-4 rounded-xl bg-white p-6 shadow-xl shadow-housd-ink/10 ring-1 ring-housd-line sm:p-8"
    >
      <div>
        <h3 className="font-housd text-2xl text-housd-ink">
          Get your quote in under 2 hours
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Tell us what you need. Your dedicated account manager replies with
          vetted options — no chasing, no hidden fees.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.name}>
          <input name="name" type="text" autoComplete="name" className={fieldBase} required />
        </Field>
        <Field label="Company" error={errors.company}>
          <input name="company" type="text" autoComplete="organization" className={fieldBase} required />
        </Field>
        <Field label="Work email" error={errors.email}>
          <input name="email" type="email" autoComplete="email" className={fieldBase} required />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <input name="phone" type="tel" autoComplete="tel" className={fieldBase} required />
        </Field>
        <Field label="Location(s) needed" error={errors.location} className="sm:col-span-2">
          <input
            name="location"
            type="text"
            placeholder="e.g. Manchester, Leeds, or multi-site"
            className={fieldBase}
            required
          />
        </Field>
        <Field label="Check-in date" error={errors.checkIn}>
          <input name="checkIn" type="date" className={fieldBase} required />
        </Field>
        <Field label="Nights" error={errors.nights}>
          <input name="nights" type="number" min={1} defaultValue={7} className={fieldBase} required />
        </Field>
        <Field label="Headcount" error={errors.headcount}>
          <input name="headcount" type="number" min={1} defaultValue={1} className={fieldBase} required />
        </Field>
        <Field label="Anything else?" error={errors.notes} className="sm:col-span-2">
          <textarea
            name="notes"
            rows={3}
            placeholder="Parking, pet-friendly, specific areas…"
            className={cn(fieldBase, "min-h-[84px]")}
          />
        </Field>
      </div>

      {serverError && (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-housd-accent px-6 py-4 text-center text-base font-semibold text-white shadow-md transition hover:bg-housd-accentDark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Get my quote"}
      </button>
      <p className="text-center text-xs text-slate-500">
        We reply within 2 working hours. No spam. No obligation.
      </p>
    </form>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium text-housd-ink">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  );
}
