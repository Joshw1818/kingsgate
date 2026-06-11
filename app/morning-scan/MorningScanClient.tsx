"use client";

import { useMemo, useState } from "react";
import type { Flag } from "@/lib/killFlag";
import {
  SCAN_WINDOWS,
  type ScanWindow,
  type ScanRow,
  type ClientCost,
  type AgencyMetrics,
} from "@/lib/scan/types";

// [chip label, chip class, left-bar class] per flag — mirrors the mockup.
const STYLE: Record<Flag, [string, string, string]> = {
  kill: ["KILL", "c-kill", "bar-kill"],
  warn: ["WARN", "c-warn", "bar-warn"],
  watch: ["WATCH", "c-watch", "bar-watch"],
  green: ["GREEN", "c-green", "bar-green"],
  learning: ["LEARNING", "c-learn", "bar-learning"],
};

function gbp(n: number): string {
  return (
    "£" +
    (Math.round(n * 100) / 100).toLocaleString("en-GB", {
      minimumFractionDigits: n % 1 ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

interface Props {
  scansByWindow: Record<ScanWindow, ScanRow[]>;
  costsByWindow: Record<ScanWindow, ClientCost[]>;
  agency: AgencyMetrics;
}

export function MorningScanClient({ scansByWindow, costsByWindow, agency }: Props) {
  const [win, setWin] = useState<ScanWindow>(1);
  const [showGreens, setShowGreens] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [log, setLog] = useState<{ time: string; label: string }[]>([]);

  const winLabel = win === 1 ? "today" : `last ${win}d`;

  const scan = scansByWindow[win] ?? [];
  const costs = costsByWindow[win] ?? [];

  const stats = useMemo(() => {
    const spend = scan.reduce((s, a) => s + a.spend, 0);
    const leads = scan.reduce((s, a) => s + a.leads, 0);
    const tracked = costs.filter((c) => c.tracksPipeline);
    const tSpend = tracked.reduce((s, c) => s + c.spend, 0);
    const tBook = tracked.reduce((s, c) => s + (c.bookings ?? 0), 0);
    const tRev = tracked.reduce((s, c) => s + (c.revenue ?? 0), 0);
    return {
      spend,
      leads,
      blendedCpl: leads ? spend / leads : null,
      bookings: tBook,
      revenue: tRev,
      roas: tSpend ? tRev / tSpend : null,
    };
  }, [scan, costs]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of scan) {
      c[a.result.flag] = (c[a.result.flag] ?? 0) + 1;
      if (a.result.fatigue) c.fat = (c.fat ?? 0) + 1;
    }
    return c;
  }, [scan]);

  const isHot = (a: ScanRow) =>
    a.result.flag === "kill" ||
    a.result.flag === "warn" ||
    a.result.flag === "watch" ||
    a.result.fatigue;
  const hot = scan.filter(isHot);
  const cold = scan.filter((a) => !isHot(a));
  const coldLabel = `${cold.filter((a) => a.result.flag === "green").length} green · ${
    cold.filter((a) => a.result.flag === "learning").length
  } learning`;

  const markDone = (a: ScanRow) => {
    const key = `${a.clientId} ${a.adsetName}`;
    if (done.has(key)) return;
    setDone((prev) => new Set(prev).add(key));
    const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setLog((prev) => [{ time, label: `${a.clientName} · ${a.adsetName}` }, ...prev]);
    // When live, this also calls logAction() → actions_log.
  };

  const Row = (a: ScanRow) => {
    const [label, chip, bar] = STYLE[a.result.flag];
    const key = `${a.clientId} ${a.adsetName}`;
    const isDone = done.has(key);
    const actionable = (a.result.flag !== "green" && a.result.flag !== "learning") || a.result.fatigue;
    return (
      <div key={key} className={`card ${bar} p-4 ${isDone ? "done" : ""}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={`chip ${chip}`}>{label}</span>
          {a.result.fatigue && <span className="chip c-fat">⚡ FATIGUE</span>}
          <span className="font-semibold">{a.clientName}</span>
          <span className="text-sm muted">{a.adsetName}</span>
          <span className="mono text-sm ml-auto">
            {winLabel}: spend {gbp(a.spend)} · {a.leads} leads · CPL{" "}
            <b>{a.result.cpl === null ? "—" : gbp(a.result.cpl)}</b>
          </span>
        </div>
        <div className="mono text-[11px] mt-2 faint">
          target {gbp(a.result.targetCpl)} · floor {gbp(a.result.floorCpl)} · kill {gbp(a.result.killCpl)}
        </div>
        <p className="text-[13px] mt-1.5 muted">{a.result.reason}</p>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <p className="text-[13px]">
            <span className="faint">Do:</span> {a.result.action}
          </p>
          {actionable && (
            <button
              className="btn markdone ml-auto"
              disabled={isDone}
              onClick={() => markDone(a)}
            >
              {isDone ? "Done ✓" : "Mark done ✓"}
            </button>
          )}
        </div>
      </div>
    );
  };

  const StatCard = ({ k, v }: { k: string; v: string | number }) => (
    <div className="card px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest mb-1 faint">{k}</div>
      <div className="mono text-xl font-bold">{v}</div>
    </div>
  );

  return (
    <div className="scan-root">
      <style>{SCAN_CSS}</style>
      <div className="relative max-w-6xl mx-auto px-5 py-8">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div>
            <span className="mono text-[11px] font-bold tracking-[.2em] neon">
              KINGSGATE · MISSION CONTROL
            </span>
            <h1 className="text-[26px] font-extrabold tracking-tight leading-none mt-1">
              Morning Scan
            </h1>
            <p className="text-sm mt-1.5 muted">
              {scan.length} ad set{scan.length === 1 ? "" : "s"} · {costs.length} accounts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="mono text-[11px] faint">
              cron daily 06:30 · reads Supabase, falls back to mock
            </span>
          </div>
        </header>

        {/* Window selector */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="flex gap-2">
            {SCAN_WINDOWS.map(({ days, label }) => (
              <button
                key={days}
                className={`wpill ${days === win ? "active" : ""}`}
                onClick={() => setWin(days)}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-[11px] faint">
            rolling, includes today · flags recompute on the selected window · fatigue is always
            trailing 3 days
          </span>
        </div>

        {/* Summary strip */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
          <StatCard k={`Spend · ${winLabel}`} v={gbp(stats.spend)} />
          <StatCard k="Leads" v={stats.leads} />
          <StatCard k="Blended CPL" v={stats.blendedCpl ? gbp(stats.blendedCpl) : "—"} />
          <StatCard k="Bookings*" v={stats.bookings} />
          <StatCard k="Revenue*" v={gbp(stats.revenue)} />
          <StatCard k="ROAS*" v={stats.roas ? stats.roas.toFixed(1) + "x" : "—"} />
        </section>
        <div className="flex flex-wrap gap-2 mb-7 items-center">
          {(["kill", "warn", "watch", "green", "learning"] as Flag[])
            .filter((f) => counts[f])
            .map((f) => (
              <span key={f} className={`chip ${STYLE[f][1]}`}>
                {counts[f]} {STYLE[f][0]}
              </span>
            ))}
          {counts.fat ? <span className="chip c-fat">⚡ {counts.fat} FATIGUE</span> : null}
          <span className="text-[11px] faint">* tracked clients only — pipelines not updated show “—”</span>
        </div>

        {/* Action queue */}
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-bold tracking-wide uppercase muted">
              Action queue · worst first
            </h2>
            <span className="mono text-[11px] faint">
              flags via killFlag.ts · daily rows from adset_metrics_daily
            </span>
          </div>
          <div className="space-y-2.5">{hot.map(Row)}</div>
          {hot.length === 0 && (
            <div className="card p-4 muted text-sm">Nothing flagged on this window — all clear.</div>
          )}
          {cold.length > 0 && (
            <>
              <button
                className="btn mt-3 w-full text-center muted"
                onClick={() => setShowGreens((s) => !s)}
              >
                {showGreens ? "Hide " : "Show "}
                {coldLabel}
                {showGreens ? " ▴" : " ▾"}
              </button>
              {showGreens && <div className="space-y-2.5 mt-2.5">{cold.map(Row)}</div>}
            </>
          )}
        </section>

        {/* Cost & ROAS by client */}
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-bold tracking-wide uppercase muted">
              Cost &amp; ROAS by client · {winLabel}
            </h2>
            <span className="mono text-[11px] faint">bookings from bookings_daily</span>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide faint">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-3 py-3">Offer</th>
                  <th className="px-3 py-3">Spend</th>
                  <th className="px-3 py-3">Leads</th>
                  <th className="px-3 py-3">CPL</th>
                  <th className="px-3 py-3">Bookings</th>
                  <th className="px-3 py-3">CPB</th>
                  <th className="px-3 py-3">Revenue</th>
                  <th className="px-3 py-3">ROAS</th>
                  <th className="px-4 py-3">Pipeline</th>
                </tr>
              </thead>
              <tbody className="mono">
                {costs.map((c) => {
                  const roasColor =
                    c.roas == null
                      ? undefined
                      : c.roas >= c.roasTarget
                      ? "var(--green)"
                      : c.roas >= 5
                      ? "var(--watch)"
                      : "var(--warn)";
                  return (
                    <tr key={c.clientId} className="border-t" style={{ borderColor: "var(--line)" }}>
                      <td className="px-4 py-2.5 font-sans font-semibold">{c.name}</td>
                      <td className="px-3 py-2.5">
                        {c.offerValue != null ? `£${c.offerValue} · ${c.roasTarget}x` : "—"}
                      </td>
                      <td className="px-3 py-2.5">{gbp(c.spend)}</td>
                      <td className="px-3 py-2.5">{c.leads}</td>
                      <td className="px-3 py-2.5">{c.cpl != null ? gbp(c.cpl) : "—"}</td>
                      <td className="px-3 py-2.5">{c.bookings != null ? c.bookings : "—"}</td>
                      <td className="px-3 py-2.5">{c.cpb != null ? gbp(c.cpb) : "—"}</td>
                      <td className="px-3 py-2.5">{c.revenue != null ? gbp(c.revenue) : "—"}</td>
                      <td className="px-3 py-2.5 font-bold" style={{ color: roasColor }}>
                        {c.roas != null ? c.roas.toFixed(1) + "x" : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {c.tracksPipeline ? (
                          <span className="chip c-green">GHL ✓</span>
                        ) : (
                          <span className="chip c-warn">not updated</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Agency economics — Pillar 2.5 */}
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-bold tracking-wide uppercase muted">
              Agency · retainers &amp; churn
            </h2>
            <span className="mono text-[11px] faint">clients ledger (Pillar 2.5)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard k="MRR" v={gbp(agency.mrr)} />
            <StatCard k="Avg retainer" v={gbp(agency.avgRetainer)} />
            <StatCard k="Active clients" v={agency.activeClients} />
            <StatCard
              k="Monthly churn"
              v={agency.monthlyChurnPct != null ? `≈${agency.monthlyChurnPct}%` : "—"}
            />
            <StatCard k="Since Jan" v={agency.sinceJan} />
            <StatCard k="New via ads" v={agency.newViaAds} />
          </div>
        </section>

        {/* Today's log */}
        <section className="mb-10">
          <h2 className="text-sm font-bold tracking-wide uppercase mb-3 muted">
            Today&apos;s log{" "}
            <span className="normal-case font-normal">(actions_log — doubles as the SOP log)</span>
          </h2>
          <div className="card p-4">
            <ul className="space-y-2 text-sm">
              {log.length === 0 ? (
                <li className="faint">
                  Nothing logged yet today — actions land here as you clear the queue.
                </li>
              ) : (
                log.map((e, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mono text-[11px] mt-0.5 faint">{e.time}</span>
                    <span>
                      {e.label} — actioned{" "}
                      <span className="mono text-[11px] faint">(→ actions_log)</span>
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        <p className="text-[12px] leading-relaxed faint">
          Pillar 0 — rendering on mock fallback. Every flag is computed live by{" "}
          <span className="mono">killFlag.ts</span> from daily rows shaped like{" "}
          <span className="mono">clients</span>, <span className="mono">adset_metrics_daily</span> and{" "}
          <span className="mono">bookings_daily</span>. Window views are pure read-time aggregation —
          no schema change. Point <span className="mono">dataSources.ts</span> at Supabase and this
          screen goes live unchanged.
        </p>
      </div>
    </div>
  );
}

// Scoped dark theme, ported from docs/mockups/morning-scan-mockup.html.
// All selectors are under .scan-root so it never leaks into the light dashboard.
const SCAN_CSS = `
.scan-root{
  --bg:#060608; --card:#0e0e12; --card2:#121218; --line:rgba(255,255,255,.07);
  --text:#e8e8ec; --muted:#8b8b95; --faint:#5c5c66;
  --brand:#960FD2; --neon:#873CF0;
  --kill:#f87171; --warn:#fb923c; --watch:#fbbf24; --green:#34d399; --learn:#6b7280; --fat:#c084fc;
  min-height:100vh; background:var(--bg); color:var(--text);
  font-family:Inter,system-ui,sans-serif; position:relative;
}
.scan-root::before{ content:""; position:fixed; inset:0; pointer-events:none; z-index:0;
  background:radial-gradient(1100px 520px at 75% -10%, rgba(150,15,210,.16), transparent 60%),
             radial-gradient(800px 400px at -10% 110%, rgba(135,60,240,.08), transparent 60%); }
.scan-root > div{ position:relative; z-index:1; }
.scan-root .mono{ font-family:'JetBrains Mono',ui-monospace,monospace; }
.scan-root .muted{ color:var(--muted); }
.scan-root .faint{ color:var(--faint); }
.scan-root .neon{ color:var(--neon); }
.scan-root .card{ background:var(--card); border:1px solid var(--line); border-radius:14px; }
.scan-root .chip{ font-family:'JetBrains Mono',ui-monospace,monospace; font-size:11px; font-weight:700; padding:2px 8px; border-radius:6px; letter-spacing:.04em; display:inline-block; }
.scan-root .c-kill{ color:var(--kill); background:rgba(248,113,113,.12); }
.scan-root .c-warn{ color:var(--warn); background:rgba(251,146,60,.12); }
.scan-root .c-watch{ color:var(--watch); background:rgba(251,191,36,.12); }
.scan-root .c-green{ color:var(--green); background:rgba(52,211,153,.12); }
.scan-root .c-learn{ color:#9ca3af; background:rgba(156,163,175,.12); }
.scan-root .c-fat{ color:var(--fat); background:rgba(192,132,252,.14); }
.scan-root .bar-kill{ box-shadow:inset 3px 0 0 0 var(--kill); }
.scan-root .bar-warn{ box-shadow:inset 3px 0 0 0 var(--warn); }
.scan-root .bar-watch{ box-shadow:inset 3px 0 0 0 var(--watch); }
.scan-root .bar-green{ box-shadow:inset 3px 0 0 0 var(--green); }
.scan-root .bar-learning{ box-shadow:inset 3px 0 0 0 var(--learn); }
.scan-root .btn{ font-size:12px; font-weight:600; padding:6px 12px; border-radius:8px; border:1px solid var(--line); color:var(--text); background:transparent; cursor:pointer; }
.scan-root .btn:hover{ background:var(--card2); }
.scan-root .btn:disabled{ cursor:default; opacity:.6; }
.scan-root .wpill{ font-family:'JetBrains Mono',ui-monospace,monospace; font-size:12px; font-weight:700; padding:6px 14px; border-radius:9px; border:1px solid var(--line); color:var(--muted); cursor:pointer; background:transparent; }
.scan-root .wpill:hover{ background:var(--card2); color:var(--text); }
.scan-root .wpill.active{ background:linear-gradient(135deg,var(--brand),var(--neon)); border-color:transparent; color:#fff; }
.scan-root .done{ opacity:.4; }
.scan-root td,.scan-root th{ white-space:nowrap; }
`;
