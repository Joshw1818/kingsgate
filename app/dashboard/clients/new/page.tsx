import Link from "next/link";
import { createClientAction } from "../actions";

export default function NewClientPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard/clients"
          className="text-xs text-slate-500 hover:underline"
        >
          ← Back to clients
        </Link>
        <h1 className="text-2xl font-semibold text-brand mt-2">Add client</h1>
      </div>

      <form
        action={createClientAction}
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
      >
        <Field label="Client name" name="name" required />
        <Field
          label="Facebook Ad Account ID"
          name="fb_ad_account_id"
          placeholder="act_1234567890"
          required
        />
        <Field
          label="GHL Location ID"
          name="ghl_location_id"
          placeholder="abc123xyz"
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Target CPL ($)"
            name="target_cpl"
            type="number"
            step="0.01"
          />
          <Field
            label="Target Cost / Booking ($)"
            name="target_cost_per_booking"
            type="number"
            step="0.01"
          />
        </div>
        <Field
          label="Monthly ad budget ($)"
          name="monthly_budget"
          type="number"
          step="0.01"
        />
        <label className="block text-sm">
          <span className="text-slate-700">Notes</span>
          <textarea
            name="notes"
            rows={3}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-brand text-white text-sm font-medium px-4 py-2 hover:bg-slate-800"
          >
            Save client
          </button>
          <Link
            href="/dashboard/clients"
            className="text-sm text-slate-500 hover:underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        step={step}
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
      />
    </label>
  );
}
