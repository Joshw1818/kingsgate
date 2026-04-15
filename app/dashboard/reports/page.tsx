import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Client, Report } from "@/lib/supabase/types";
import { ReportGenerator } from "@/components/ReportGenerator";
import { DemoBanner } from "@/components/DemoBanner";
import { DEMO_CLIENTS, DEMO_REPORTS, isDemoMode } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  let clients: Client[];
  let reports: Report[];

  if (isDemoMode()) {
    clients = DEMO_CLIENTS;
    reports = DEMO_REPORTS;
  } else {
    const supabase = await createSupabaseServerClient();
    const [clientsRes, reportsRes] = await Promise.all([
      supabase.from("clients").select("*").eq("active", true).order("name"),
      supabase
        .from("reports")
        .select("*")
        .order("generated_at", { ascending: false })
        .limit(50),
    ]);
    clients = (clientsRes.data ?? []) as Client[];
    reports = (reportsRes.data ?? []) as Report[];
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="space-y-8">
      <DemoBanner />
      <div>
        <h1 className="text-2xl font-semibold text-brand">Reports</h1>
        <p className="text-sm text-slate-500 mt-1">
          Generate a 7- or 30-day performance report. Each report gets a
          shareable public link with no login required.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-700">Generate a report</h2>
        <div className="space-y-2">
          {clients.length === 0 && (
            <p className="text-sm text-slate-400">
              No active clients —{" "}
              <Link href="/dashboard/clients/new" className="text-brand-accent hover:underline">
                add one first
              </Link>
              .
            </p>
          )}
          {clients.map((c) => (
            <ReportGenerator key={c.id} clientId={c.id} clientName={c.name} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-700">Recent reports</h2>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Client</th>
                <th className="text-left px-4 py-2 font-medium">Window</th>
                <th className="text-left px-4 py-2 font-medium">Generated</th>
                <th className="text-left px-4 py-2 font-medium">Share link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-slate-400 py-6">
                    No reports generated yet.
                  </td>
                </tr>
              )}
              {reports.map((r) => {
                const payload = r.payload as {
                  client?: { name?: string };
                };
                const name = payload?.client?.name ?? "—";
                const url = `${base}/r/${r.share_token}`;
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="px-4 py-3">{r.window}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(r.generated_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-accent hover:underline text-xs break-all"
                      >
                        {url}
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
