"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { aggregateKpis, dateNDaysAgo, windowDays } from "@/lib/kpis";
import { runAnalysis } from "@/lib/anthropic";
import type { Client, DailyKpi, ReportWindow } from "@/lib/supabase/types";

const CACHE_TTL_HOURS = 6;

export async function generateReportAction(
  clientId: string,
  window: ReportWindow
): Promise<{ shareUrl: string }> {
  const supabase = await createSupabaseServerClient();
  const since = dateNDaysAgo(windowDays(window));

  const [clientRes, kpisRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).single(),
    supabase
      .from("daily_kpis")
      .select("*")
      .eq("client_id", clientId)
      .gte("date", since)
      .order("date"),
  ]);

  if (!clientRes.data) throw new Error("Client not found");
  const client = clientRes.data as Client;
  const kpis = (kpisRes.data ?? []) as DailyKpi[];
  const agg = aggregateKpis(kpis);

  const aiPayload = {
    client: {
      name: client.name,
      target_cpl: client.target_cpl,
      target_cost_per_booking: client.target_cost_per_booking,
    },
    window,
    totals: agg,
    daily: kpis.map((r) => ({
      date: r.date,
      spend: Number(r.spend),
      leads: Number(r.leads),
      bookings: Number(r.bookings),
      ctr: Number(r.ctr),
      cost_per_booking: r.cost_per_booking,
    })),
  };

  const { markdown } = await runAnalysis(aiPayload, {
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

  const shareToken = crypto.randomBytes(18).toString("base64url");

  const { error } = await supabase.from("reports").insert({
    client_id: clientId,
    window,
    share_token: shareToken,
    payload: {
      client: {
        id: client.id,
        name: client.name,
        target_cpl: client.target_cpl,
        target_cost_per_booking: client.target_cost_per_booking,
      },
      totals: agg,
      daily: kpis.map((r) => ({
        date: r.date,
        spend: Number(r.spend),
        leads: Number(r.leads),
        bookings: Number(r.bookings),
      })),
    },
    ai_summary_md: markdown,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/reports");

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return { shareUrl: `${base}/r/${shareToken}` };
}
