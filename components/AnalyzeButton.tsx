"use client";

import { useState, useTransition } from "react";
import type { ReportWindow } from "@/lib/supabase/types";

export function AnalyzeButton({
  clientId,
  window,
}: {
  clientId: string;
  window: ReportWindow;
}) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_id: clientId, window }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as {
          markdown: string;
          cached: boolean;
        };
        setMarkdown(data.markdown);
        setCached(data.cached);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={run}
          disabled={pending}
          className="rounded-md bg-brand-accent text-white text-sm font-medium px-3 py-2 hover:bg-emerald-600 disabled:opacity-50"
        >
          {pending ? "Analyzing…" : `Run AI analysis (${window})`}
        </button>
        {cached && markdown && (
          <span className="text-xs text-slate-400">served from cache</span>
        )}
      </div>
      {error && <p className="text-sm text-severity-high">{error}</p>}
      {markdown && (
        <div className="prose prose-sm max-w-none bg-white border border-slate-200 rounded-lg p-5 whitespace-pre-wrap">
          {markdown}
        </div>
      )}
    </div>
  );
}
