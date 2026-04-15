"use client";

import { useState, useTransition } from "react";
import type { DeepAnalysis } from "@/lib/ai/schema";
import type { ReportWindow } from "@/lib/supabase/types";
import { DeepAnalysisCard } from "./DeepAnalysisCard";
import { AnalysisChat } from "./AnalysisChat";

export function ClientAnalysisPanel({
  clientId,
  initialWindow = "7d",
}: {
  clientId: string;
  initialWindow?: ReportWindow;
}) {
  const [window, setWindow] = useState<ReportWindow>(initialWindow);
  const [analysis, setAnalysis] = useState<DeepAnalysis | null>(null);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(nextWindow: ReportWindow) {
    setError(null);
    setWindow(nextWindow);
    startTransition(async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_id: clientId, window: nextWindow }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as {
          analysis: DeepAnalysis;
          cached: boolean;
        };
        setAnalysis(data.analysis);
        setCached(data.cached);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => run("7d")}
            disabled={pending}
            className="rounded-md bg-brand-accent text-white text-sm font-medium px-3 py-2 hover:bg-emerald-600 disabled:opacity-50"
          >
            {pending && window === "7d"
              ? "Thinking…"
              : analysis && window === "7d"
              ? "Re-run 7d"
              : "Run AI analysis (7d)"}
          </button>
          <button
            onClick={() => run("30d")}
            disabled={pending}
            className="rounded-md border border-slate-300 text-sm font-medium px-3 py-2 hover:bg-slate-50 disabled:opacity-50"
          >
            {pending && window === "30d" ? "Thinking…" : "30d"}
          </button>
        </div>
        {analysis && (
          <span className="text-[11px] text-slate-400">
            window: {window}
            {cached ? " · cached" : ""}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-severity-high">
          {error}
        </div>
      )}

      {!analysis && !pending && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-400">
          Click <strong>Run AI analysis</strong> to generate a full
          structured diagnosis with priority-ranked actions. You'll then be
          able to ask follow-up questions to interrogate the findings.
        </div>
      )}

      {analysis && (
        <>
          <DeepAnalysisCard analysis={analysis} cached={cached} />
          <AnalysisChat clientId={clientId} analysis={analysis} />
        </>
      )}
    </div>
  );
}
