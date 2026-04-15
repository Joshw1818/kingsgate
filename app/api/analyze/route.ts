import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { aggregateKpis, dateNDaysAgo, windowDays } from "@/lib/kpis";
import { runDeepAnalysis } from "@/lib/anthropic";
import { DeepAnalysisSchema, type DeepAnalysis } from "@/lib/ai/schema";
import type {
  Client,
  DailyKpi,
  Flag,
  ReportWindow,
} from "@/lib/supabase/types";
import { DEMO_AD_INSIGHTS, DEMO_DEEP_ANALYSIS, isDemoMode } from "@/lib/demo";

const BodySchema = z.object({
  client_id: z.string(),
  window: z.enum(["7d", "30d"]),
});

const CACHE_TTL_HOURS = 6;

export async function POST(request: Request) {
  const body = BodySchema.parse(await request.json());
  const { client_id, window } = body;

  // ----- Demo mode: canned structured analysis --------------------
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 700)); // simulate thinking
    return NextResponse.json({
      analysis: DEMO_DEEP_ANALYSIS,
      cached: false,
      window: window as ReportWindow,
    });
  }

  // ----- Live mode: real data + Claude deep analysis --------------
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = windowDays(window);
  const [clientRes, kpisRes, flagsRes, adsRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", client_id).single(),
    supabase
      .from("daily_kpis")
      .select("*")
      .eq("client_id", client_id)
      .gte("date", dateNDaysAgo(days * 2)) // pull baseline too
      .order("date"),
    supabase
      .from("flags")
      .select("*")
      .eq("client_id", client_id)
      .is("resolved_at", null),
    supabase
      .from("fb_ad_insights_daily")
      .select("*")
      .eq("client_id", client_id)
      .gte("date", dateNDaysAgo(days))
      .order("spend", { ascending: false }),
  ]);

  if (!clientRes.data) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  const client = clientRes.data as Client;
  const kpis = (kpisRes.data ?? []) as DailyKpi[];
  const flags = (flagsRes.data ?? []) as Flag[];
  const ads = (adsRes.data ?? []) as Array<Record<string, unknown>>;

  // Aggregate ads by ad_id so we send one row per ad, not per day.
  const adsById = new Map<string, Record<string, unknown>>();
  for (const row of ads) {
    const id = String(row.ad_id);
    const existing = adsById.get(id);
    if (!existing) {
      adsById.set(id, { ...row });
    } else {
      existing.spend = Number(existing.spend ?? 0) + Number(row.spend ?? 0);
      existing.impressions =
        Number(existing.impressions ?? 0) + Number(row.impressions ?? 0);
      existing.clicks = Number(existing.clicks ?? 0) + Number(row.clicks ?? 0);
    }
  }
  const adSummary = Array.from(adsById.values())
    .sort((a, b) => Number(b.spend ?? 0) - Number(a.spend ?? 0))
    .slice(0, 10);

  const topImageUrls = adSummary
    .slice(0, 5)
    .map((a) => a.thumbnail_url as string | undefined)
    .filter((u): u is string => typeof u === "string" && u.length > 0);

  const windowKpis = kpis.filter((r) => r.date >= dateNDaysAgo(days));
  const baselineKpis = kpis.filter((r) => r.date < dateNDaysAgo(days));

  const agg = aggregateKpis(windowKpis);
  const baseline = aggregateKpis(baselineKpis);

  const payload = {
    client: {
      name: client.name,
      target_cpl: client.target_cpl,
      target_cost_per_booking: client.target_cost_per_booking,
      monthly_budget: client.monthly_budget,
    },
    window,
    totals: agg,
    baseline_prior_window: baseline,
    daily: windowKpis.map((r) => ({
      date: r.date,
      spend: Number(r.spend),
      leads: Number(r.leads),
      bookings: Number(r.bookings),
      ctr: Number(r.ctr),
      frequency: Number(r.frequency),
      cost_per_lead: r.cost_per_lead,
      cost_per_booking: r.cost_per_booking,
    })),
    top_ads_by_spend: adSummary,
    active_flags: flags.map((f) => ({
      type: f.flag_type,
      severity: f.severity,
      metrics: f.metrics,
    })),
  };

  const { analysis, cached, usage } = await runDeepAnalysis({
    payload,
    creativeImageUrls: topImageUrls,
    async getCached(key) {
      const { data } = await supabase
        .from("ai_cache")
        .select("response, created_at")
        .eq("cache_key", key)
        .single();
      if (!data) return null;
      const ageHours =
        (Date.now() - new Date(data.created_at).getTime()) /
        (1000 * 60 * 60);
      if (ageHours > CACHE_TTL_HOURS) return null;
      try {
        return DeepAnalysisSchema.parse(JSON.parse(data.response));
      } catch {
        return null;
      }
    },
    async setCached(key, value) {
      await supabase.from("ai_cache").upsert({
        cache_key: key,
        response: JSON.stringify(value),
        created_at: new Date().toISOString(),
      });
    },
  });

  return NextResponse.json({
    analysis,
    cached,
    usage,
    window: window as ReportWindow,
  });
}
