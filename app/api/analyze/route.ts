import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { aggregateKpis, dateNDaysAgo, windowDays } from "@/lib/kpis";
import { runAnalysis } from "@/lib/anthropic";
import type { Client, DailyKpi, Flag, ReportWindow } from "@/lib/supabase/types";
import { DEMO_AI_SUMMARY, isDemoMode } from "@/lib/demo";

const BodySchema = z.object({
  client_id: z.string(),
  window: z.enum(["7d", "30d"]),
});

const CACHE_TTL_HOURS = 6;

export async function POST(request: Request) {
  const body = BodySchema.parse(await request.json());
  const { client_id, window } = body;

  // Demo mode — return canned markdown, no auth, no Claude call.
  if (isDemoMode()) {
    // Small delay so the "Analyzing…" state is visible.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({
      markdown: DEMO_AI_SUMMARY(),
      cached: false,
      window: window as ReportWindow,
    });
  }

  // Auth — only signed-in agency users can call this.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [clientRes, kpisRes, flagsRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", client_id).single(),
    supabase
      .from("daily_kpis")
      .select("*")
      .eq("client_id", client_id)
      .gte("date", dateNDaysAgo(windowDays(window)))
      .order("date"),
    supabase
      .from("flags")
      .select("*")
      .eq("client_id", client_id)
      .is("resolved_at", null),
  ]);

  if (!clientRes.data) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  const client = clientRes.data as Client;
  const kpis = (kpisRes.data ?? []) as DailyKpi[];
  const flags = (flagsRes.data ?? []) as Flag[];

  const agg = aggregateKpis(kpis);

  const payload = {
    client: {
      name: client.name,
      target_cpl: client.target_cpl,
      target_cost_per_booking: client.target_cost_per_booking,
      monthly_budget: client.monthly_budget,
    },
    window,
    totals: agg,
    daily: kpis.map((r) => ({
      date: r.date,
      spend: Number(r.spend),
      leads: Number(r.leads),
      bookings: Number(r.bookings),
      ctr: Number(r.ctr),
      frequency: Number(r.frequency),
      cost_per_lead: r.cost_per_lead,
      cost_per_booking: r.cost_per_booking,
    })),
    active_flags: flags.map((f) => ({
      type: f.flag_type,
      severity: f.severity,
      metrics: f.metrics,
    })),
  };

  const { markdown, cached } = await runAnalysis(payload, {
    async getCached(key) {
      const { data } = await supabase
        .from("ai_cache")
        .select("response, created_at")
        .eq("cache_key", key)
        .single();
      if (!data) return null;
      const ageHours =
        (Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60);
      if (ageHours > CACHE_TTL_HOURS) return null;
      return data.response;
    },
    async setCached(key, value) {
      await supabase.from("ai_cache").upsert({
        cache_key: key,
        response: value,
        created_at: new Date().toISOString(),
      });
    },
  });

  return NextResponse.json({ markdown, cached, window: window as ReportWindow });
}
