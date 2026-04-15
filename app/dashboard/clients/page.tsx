import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/supabase/types";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientsListPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .order("name");
  const clients = (data ?? []) as Client[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-brand">Clients</h1>
        <Link
          href="/dashboard/clients/new"
          className="text-sm rounded-md bg-brand text-white px-3 py-2 hover:bg-slate-800"
        >
          + Add client
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">FB Account</th>
              <th className="text-left px-4 py-2 font-medium">GHL Location</th>
              <th className="text-right px-4 py-2 font-medium">Target CPL</th>
              <th className="text-right px-4 py-2 font-medium">Target CPB</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/clients/${c.id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                  {c.fb_ad_account_id}
                </td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                  {c.ghl_location_id}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCurrency(c.target_cpl)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCurrency(c.target_cost_per_booking)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      c.active
                        ? "text-severity-ok text-xs"
                        : "text-slate-400 text-xs"
                    }
                  >
                    {c.active ? "Active" : "Paused"}
                  </span>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400">
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
