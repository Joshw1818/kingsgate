"use client";

import { useState, useTransition } from "react";
import { generateReportAction } from "@/app/dashboard/reports/actions";
import type { ReportWindow } from "@/lib/supabase/types";

export function ReportGenerator({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handle(window: ReportWindow) {
    setError(null);
    startTransition(async () => {
      try {
        const { shareUrl } = await generateReportAction(clientId, window);
        setLastUrl(shareUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3">
      <div>
        <div className="text-sm font-medium text-brand">{clientName}</div>
        {lastUrl && (
          <a
            href={lastUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-brand-accent hover:underline break-all"
          >
            {lastUrl}
          </a>
        )}
        {error && <div className="text-xs text-severity-high">{error}</div>}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handle("7d")}
          disabled={pending}
          className="text-xs rounded-md bg-brand text-white px-3 py-2 hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "…" : "7-day report"}
        </button>
        <button
          onClick={() => handle("30d")}
          disabled={pending}
          className="text-xs rounded-md bg-brand text-white px-3 py-2 hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "…" : "30-day report"}
        </button>
      </div>
    </div>
  );
}
