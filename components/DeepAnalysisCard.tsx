"use client";

import { useState } from "react";
import type {
  DeepAnalysis,
  Priority,
  Severity,
  Lever,
  Confidence,
} from "@/lib/ai/schema";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-red-50 text-severity-high ring-red-200",
  watch: "bg-amber-50 text-severity-medium ring-amber-200",
  healthy: "bg-emerald-50 text-severity-ok ring-emerald-200",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  watch: "Watch",
  healthy: "Healthy",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  P0: "bg-red-100 text-severity-high ring-red-200",
  P1: "bg-amber-100 text-severity-medium ring-amber-200",
  P2: "bg-slate-100 text-slate-600 ring-slate-200",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  P0: "P0 · Today",
  P1: "P1 · This week",
  P2: "P2 · When possible",
};

const LEVER_EMOJI: Record<Lever, string> = {
  offer: "🎯",
  audience: "👥",
  creative: "🎨",
  funnel: "🔀",
  bid: "💰",
};

const LEVER_LABEL: Record<Lever, string> = {
  offer: "Offer",
  audience: "Audience",
  creative: "Creative",
  funnel: "Funnel",
  bid: "Bid / Budget",
};

const CONFIDENCE_DOT: Record<Confidence, string> = {
  high: "bg-severity-ok",
  medium: "bg-severity-medium",
  low: "bg-slate-300",
};

export function DeepAnalysisCard({
  analysis,
  cached,
}: {
  analysis: DeepAnalysis;
  cached?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-5">
      {/* Headline */}
      <div
        className={cn(
          "rounded-xl ring-1 p-5 flex items-start gap-4",
          SEVERITY_STYLES[analysis.severity]
        )}
      >
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
            {SEVERITY_LABEL[analysis.severity]}
          </div>
          <p className="text-base font-semibold mt-1 leading-snug">
            {analysis.headline_diagnosis}
          </p>
          {cached && (
            <div className="text-[11px] opacity-60 mt-2">
              served from cache
            </div>
          )}
        </div>
      </div>

      {/* Root causes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Root causes
          </h3>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[11px] text-slate-400 hover:text-slate-700"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
        {expanded && (
          <div className="grid gap-3">
            {analysis.root_causes.map((rc, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">
                      {LEVER_EMOJI[rc.lever]}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {LEVER_LABEL[rc.lever]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        CONFIDENCE_DOT[rc.confidence]
                      )}
                    />
                    {rc.confidence} confidence
                  </div>
                </div>
                <p className="text-sm text-slate-800">{rc.hypothesis}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {rc.evidence.map((ev, j) => (
                    <span
                      key={j}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-[11px] text-slate-700 px-2 py-1 font-mono"
                      title={ev.context}
                    >
                      <span className="text-slate-400">{ev.metric}:</span>
                      <span className="font-semibold">
                        {typeof ev.value === "number"
                          ? ev.value.toLocaleString()
                          : ev.value}
                      </span>
                      <span className="text-slate-400">({ev.context})</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Recommended actions
        </h3>
        <ol className="space-y-2">
          {analysis.actions.map((a, i) => (
            <li
              key={i}
              className="bg-white border border-slate-200 rounded-lg p-4 flex gap-4"
            >
              <div className="pt-0.5">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full ring-1 text-[10px] font-semibold px-2 py-0.5",
                    PRIORITY_STYLES[a.priority]
                  )}
                >
                  {PRIORITY_LABEL[a.priority]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900">
                  <span className="font-semibold">{a.verb}.</span>{" "}
                  {a.description}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Expected impact: {a.expected_impact}
                </p>
                {a.affected_ad_ids && a.affected_ad_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {a.affected_ad_ids.map((adId) => (
                      <span
                        key={adId}
                        className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 font-mono"
                      >
                        {adId}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
