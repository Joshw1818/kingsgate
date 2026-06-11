"use client";

import { useMemo, useState } from "react";
import {
  computeClient,
  applyMarkPaid,
  arrangement,
  todayUTC,
  type LedgerClient,
  type Stage,
  type DueStatus,
} from "@/lib/scan/billing";
import type { ClientTrackerRow } from "@/lib/scan/types";
import { MC_CSS } from "@/lib/scan/theme";
import { MissionControlNav } from "@/components/mission-control/Nav";

type FilterKey = "all" | Stage | DueStatus;

const STAGE: Record<Stage, [string, string]> = {
  offer: ["c-offer", "Offer"],
  recurring: ["c-green", "Recurring"],
  churned: ["c-grey", "Churned"],
};
const STATUS_CLASS: Record<DueStatus, string> = {
  overdue: "c-red",
  due_soon: "c-amber",
  current: "c-green",
};

const gbp = (n: number) => "£" + Number(n).toLocaleString("en-GB");
const fmt = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

function statusLabel(s: DueStatus, dd: number): string {
  if (s === "overdue") return `Overdue ${Math.abs(dd)}d`;
  if (s === "due_soon") return dd === 0 ? "Due today" : `Due in ${dd}d`;
  return "Current";
}

function strip(row: ClientTrackerRow): LedgerClient {
  const { computed: _omit, ...rest } = row;
  void _omit;
  return rest;
}

export function ClientTrackerClient({ rows }: { rows: ClientTrackerRow[] }) {
  const [ledger, setLedger] = useState<LedgerClient[]>(() => rows.map(strip));
  const [filter, setFilter] = useState<FilterKey>("all");
  const today = useMemo(() => todayUTC(), []);

  // Recompute lifecycle/billing on every change — same logic as the server.
  const computed = useMemo(
    () =>
      ledger
        .map((c) => ({ c, r: computeClient(c, today) }))
        .sort((a, b) => a.r.due.localeCompare(b.r.due)),
    [ledger, today]
  );

  const summary = useMemo(() => {
    const inOffer = computed.filter((x) => x.r.stage === "offer");
    const overdue = computed.filter((x) => x.r.status === "overdue");
    const dueSoon = computed.filter((x) => x.r.status === "due_soon");
    const recurring = computed.filter((x) => x.r.stage === "recurring");
    const active = ledger.filter((c) => !c.end);
    const mrr = active.reduce((s, c) => s + c.mrr, 0);
    return {
      active: active.length,
      inOffer,
      overdue,
      dueSoon,
      recurring,
      overdueSum: overdue.reduce((s, x) => s + x.r.amount, 0),
      dueSoonSum: dueSoon.reduce((s, x) => s + x.r.amount, 0),
      mrr,
      avg: active.length ? Math.round((mrr / active.length) * 100) / 100 : 0,
    };
  }, [computed, ledger]);

  const markPaid = (id: string) => {
    setLedger((prev) => prev.map((c) => (c.id === id ? applyMarkPaid(c) : c)));
    // When live, a server action also writes the paid row to billing_schedule.
  };

  const filters: [FilterKey, string, number][] = [
    ["all", "All", ledger.length],
    ["offer", "Offer period", summary.inOffer.length],
    ["recurring", "Recurring", summary.recurring.length],
    ["overdue", "Overdue", summary.overdue.length],
    ["due_soon", "Due ≤7d", summary.dueSoon.length],
  ];

  const shown = computed.filter((x) =>
    filter === "all" ? true : x.r.stage === filter || x.r.status === filter
  );

  const StatCard = ({ k, v }: { k: string; v: string | number }) => (
    <div className="card px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest mb-1 faint">{k}</div>
      <div className="mono text-xl font-bold">{v}</div>
    </div>
  );

  return (
    <div className="mc-root">
      <style>{MC_CSS}</style>
      <div className="relative max-w-6xl mx-auto px-5 py-8">
        <MissionControlNav />

        <header className="mb-5">
          <h1 className="text-[26px] font-extrabold tracking-tight leading-none">Client Tracker</h1>
          <p className="text-sm mt-1.5 muted">
            Lifecycle, billing arrangement &amp; what&apos;s due
          </p>
        </header>

        {/* Summary */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          <StatCard k="Active clients" v={summary.active} />
          <StatCard k="In offer period" v={summary.inOffer.length} />
          <StatCard k="Overdue" v={`${summary.overdue.length} · ${gbp(summary.overdueSum)}`} />
          <StatCard k="Due ≤7 days" v={`${summary.dueSoon.length} · ${gbp(summary.dueSoonSum)}`} />
          <StatCard k="MRR" v={gbp(summary.mrr)} />
          <StatCard k="Avg retainer" v={gbp(summary.avg)} />
        </section>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="flex flex-wrap gap-2">
            {filters.map(([k, label, n]) => (
              <button
                key={k}
                className={`pill ${k === filter ? "active" : ""}`}
                onClick={() => setFilter(k)}
              >
                {label} <span className="sub">{n}</span>
              </button>
            ))}
          </div>
          <span className="text-[11px] ml-1 faint">
            stage &amp; due date computed from start_date + billing_type · paid status manual until
            Stripe (P7)
          </span>
        </div>

        {/* Table */}
        <section className="card overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide faint">
                <th className="px-4 py-3">Client</th>
                <th className="px-3 py-3">Stage</th>
                <th className="px-3 py-3">Billing arrangement</th>
                <th className="px-3 py-3">Next due</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">MRR</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ c, r }) => {
                const [sc, sl] = STAGE[r.stage];
                const arr = arrangement(c);
                return (
                  <tr
                    key={c.id}
                    className={`border-t ${r.status === "current" ? "" : ""}`}
                    style={{ borderColor: "var(--line)" }}
                  >
                    <td className="px-4 py-3 font-semibold">{c.name}</td>
                    <td className="px-3 py-3 align-top">
                      {r.stage === "offer" ? (
                        <>
                          <span className={`chip ${sc}`}>Offer · Day {r.dayN}/50</span>
                          <div className="text-[11px] mt-1 faint">ends {fmt(r.offerEnd)}</div>
                        </>
                      ) : (
                        <span className={`chip ${sc}`}>{sl}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {arr.label}
                      {arr.sub && <span className="sub"> {arr.sub}</span>}
                    </td>
                    <td className="px-3 py-3 mono">
                      {fmt(r.due)} · {gbp(r.amount)}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`chip ${STATUS_CLASS[r.status]}`}>
                        {statusLabel(r.status, r.daysToDue)}
                      </span>
                    </td>
                    <td className="px-3 py-3 mono">{gbp(c.mrr)}</td>
                    <td className="px-4 py-3 text-right">
                      {r.status !== "current" && (
                        <button className="markpaid" onClick={() => markPaid(c.id)}>
                          Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <p className="text-[12px] leading-relaxed faint">
          Pillar 2.6 — retainers are real (June 2026 roster), billing dates illustrative until seeded.
          Every stage and due date is computed live from data shaped like the{" "}
          <span className="mono">clients</span> ledger + <span className="mono">billing_schedule</span>{" "}
          table, sorted soonest/overdue first. &ldquo;Mark paid&rdquo; advances the next due — the
          same action Stripe performs automatically once P7 is wired.
        </p>
      </div>
    </div>
  );
}
