// Supabase Edge Function — evaluates the flag rule engine for every
// active client and reconciles the `flags` table (insert new, resolve
// recovered). Runs 5 minutes after each sync via pg_cron.

import { daysAgoISO, getServiceClient, jsonResponse } from "../_shared/supabase.ts";
import { evaluateFlags, type FlagEvaluation } from "../_shared/flags.ts";

Deno.serve(async () => {
  const supabase = getServiceClient();
  const since = daysAgoISO(30);

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name, target_cpl, target_cost_per_booking")
    .eq("active", true);
  if (error) return jsonResponse({ error: error.message }, 500);

  const results: Record<string, { added: number; resolved: number }> = {};

  for (const client of clients ?? []) {
    const { data: kpis } = await supabase
      .from("daily_kpis")
      .select("*")
      .eq("client_id", client.id)
      .gte("date", since)
      .order("date");

    const evals: FlagEvaluation[] = evaluateFlags(client, kpis ?? []);

    const { data: activeFlags } = await supabase
      .from("flags")
      .select("*")
      .eq("client_id", client.id)
      .is("resolved_at", null);

    const activeByType = new Map(
      (activeFlags ?? []).map((f) => [f.flag_type, f])
    );
    const evalByType = new Map(evals.map((e) => [e.flag_type, e]));

    let added = 0;
    let resolved = 0;

    // Insert brand-new flags (no active flag of this type exists yet)
    for (const evaln of evals) {
      if (!activeByType.has(evaln.flag_type)) {
        const { error: insErr } = await supabase.from("flags").insert({
          client_id: client.id,
          flag_type: evaln.flag_type,
          severity: evaln.severity,
          metrics: evaln.metrics,
          diagnosis_md: evaln.description,
        });
        if (!insErr) added++;
      }
    }

    // Resolve flags that no longer fire
    for (const [type, flag] of activeByType.entries()) {
      if (!evalByType.has(type)) {
        await supabase
          .from("flags")
          .update({ resolved_at: new Date().toISOString() })
          .eq("id", flag.id);
        resolved++;
      }
    }

    results[client.id] = { added, resolved };
  }

  return jsonResponse({ ok: true, results });
});
