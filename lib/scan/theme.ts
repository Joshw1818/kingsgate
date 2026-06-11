// Shared Mission Control dark theme. All selectors live under `.mc-root` so the
// theme never leaks into the legacy light dashboard. Ported from the mockups
// (morning-scan + client-tracker), merged into one stylesheet.

export const MC_CSS = `
.mc-root{
  --bg:#060608; --card:#0e0e12; --card2:#121218; --line:rgba(255,255,255,.07);
  --text:#e8e8ec; --muted:#8b8b95; --faint:#5c5c66;
  --brand:#960FD2; --neon:#873CF0;
  --kill:#f87171; --warn:#fb923c; --watch:#fbbf24; --green:#34d399; --learn:#6b7280; --fat:#c084fc;
  --red:#f87171; --amber:#fbbf24; --grey:#6b7280; --offer:#c084fc;
  min-height:100vh; background:var(--bg); color:var(--text);
  font-family:Inter,system-ui,sans-serif; position:relative;
}
.mc-root::before{ content:""; position:fixed; inset:0; pointer-events:none; z-index:0;
  background:radial-gradient(1100px 520px at 75% -10%, rgba(150,15,210,.16), transparent 60%),
             radial-gradient(800px 400px at -10% 110%, rgba(135,60,240,.08), transparent 60%); }
.mc-root > div{ position:relative; z-index:1; }
.mc-root .mono{ font-family:'JetBrains Mono',ui-monospace,monospace; }
.mc-root .muted{ color:var(--muted); }
.mc-root .faint{ color:var(--faint); }
.mc-root .neon{ color:var(--neon); }
.mc-root .sub{ color:var(--faint); font-weight:400; }
.mc-root .card{ background:var(--card); border:1px solid var(--line); border-radius:14px; }
.mc-root .chip{ font-family:'JetBrains Mono',ui-monospace,monospace; font-size:11px; font-weight:700; padding:2px 8px; border-radius:6px; letter-spacing:.04em; display:inline-block; white-space:nowrap; }
.mc-root .c-kill,.mc-root .c-red{ color:var(--kill); background:rgba(248,113,113,.12); }
.mc-root .c-warn{ color:var(--warn); background:rgba(251,146,60,.12); }
.mc-root .c-watch,.mc-root .c-amber{ color:var(--watch); background:rgba(251,191,36,.12); }
.mc-root .c-green{ color:var(--green); background:rgba(52,211,153,.12); }
.mc-root .c-learn,.mc-root .c-grey{ color:#9ca3af; background:rgba(156,163,175,.12); }
.mc-root .c-fat,.mc-root .c-offer{ color:var(--fat); background:rgba(192,132,252,.14); }
.mc-root .bar-kill{ box-shadow:inset 3px 0 0 0 var(--kill); }
.mc-root .bar-warn{ box-shadow:inset 3px 0 0 0 var(--warn); }
.mc-root .bar-watch{ box-shadow:inset 3px 0 0 0 var(--watch); }
.mc-root .bar-green{ box-shadow:inset 3px 0 0 0 var(--green); }
.mc-root .bar-learning{ box-shadow:inset 3px 0 0 0 var(--learn); }
.mc-root .btn{ font-size:12px; font-weight:600; padding:6px 12px; border-radius:8px; border:1px solid var(--line); color:var(--text); background:transparent; cursor:pointer; }
.mc-root .btn:hover{ background:var(--card2); }
.mc-root .btn:disabled{ cursor:default; opacity:.6; }
.mc-root .pill,.mc-root .wpill{ font-family:'JetBrains Mono',ui-monospace,monospace; font-size:12px; font-weight:700; padding:6px 14px; border-radius:9px; border:1px solid var(--line); color:var(--muted); cursor:pointer; background:transparent; }
.mc-root .pill:hover,.mc-root .wpill:hover{ background:var(--card2); color:var(--text); }
.mc-root .pill.active,.mc-root .wpill.active{ background:linear-gradient(135deg,var(--brand),var(--neon)); border-color:transparent; color:#fff; }
.mc-root .markpaid{ font-size:11px; font-weight:600; padding:3px 9px; border-radius:7px; border:1px solid var(--line); color:var(--muted); cursor:pointer; background:transparent; }
.mc-root .markpaid:hover{ background:var(--card2); color:var(--text); }
.mc-root .markpaid:disabled{ opacity:.5; cursor:default; }
.mc-root .done,.mc-root .paidrow{ opacity:.45; }
.mc-root .navtab{ padding:6px 12px; border-radius:9px; color:var(--muted); font-size:14px; }
.mc-root .navtab:hover{ background:var(--card2); color:var(--text); }
.mc-root .navtab.active{ background:var(--card); border:1px solid var(--line); color:var(--text); font-weight:600; }
.mc-root td,.mc-root th{ white-space:nowrap; }
`;
