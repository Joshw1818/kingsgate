// lib/sync/meta.ts — STARTER. Pulls daily ad-level insights into adset_metrics_daily.
// Adapt the supabase client import to your Mission Control setup. Run via /api/sync/meta.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
);

const GRAPH = "https://graph.facebook.com/v21.0";
const LEAD_ACTION_TYPES = ["lead", "leadgen_grouped", "onsite_conversion.lead_grouped"];

type InsightRow = {
  date_start: string;
  campaign_id?: string; campaign_name?: string;
  adset_id?: string; adset_name?: string;
  ad_id?: string; ad_name?: string;
  spend?: string; impressions?: string; frequency?: string;
  actions?: { action_type: string; value: string }[];
};

function leadsFrom(actions?: InsightRow["actions"]): number {
  if (!actions) return 0;
  return actions
    .filter((a) => LEAD_ACTION_TYPES.includes(a.action_type))
    .reduce((sum, a) => sum + Number(a.value || 0), 0);
}

async function fetchInsights(accountId: string, datePreset: string): Promise<InsightRow[]> {
  const fields = [
    "campaign_id", "campaign_name", "adset_id", "adset_name", "ad_id", "ad_name",
    "spend", "impressions", "frequency", "actions",
  ].join(",");
  let url =
    `${GRAPH}/${accountId}/insights?level=ad&time_increment=1&date_preset=${datePreset}` +
    `&fields=${fields}&limit=500&access_token=${process.env.META_ACCESS_TOKEN}`;

  const rows: InsightRow[] = [];
  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Meta insights ${accountId}: ${res.status} ${await res.text()}`);
    const json = await res.json();
    rows.push(...(json.data ?? []));
    url = json.paging?.next ?? ""; // follow cursors
  }
  return rows;
}

/** backfill=true on the first ever run (last_30d) so 7d/30d views populate; daily cron uses last_3d. */
export async function syncMeta({ backfill = false } = {}) {
  const datePreset = backfill ? "last_30d" : "last_3d";

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, meta_ad_account_id")
    .not("meta_ad_account_id", "is", null);
  if (error) throw error;

  let upserted = 0;
  for (const c of clients ?? []) {
    const insights = await fetchInsights(c.meta_ad_account_id, datePreset);
    const rows = insights.map((r) => ({
      client_id: c.id,
      date: r.date_start,
      campaign_id: r.campaign_id ?? null,
      campaign_name: r.campaign_name ?? null,
      adset_id: r.adset_id ?? "",
      adset_name: r.adset_name ?? null,
      ad_id: r.ad_id ?? "",            // NOT NULL default '' so upsert key works
      ad_name: r.ad_name ?? null,
      spend: Number(r.spend ?? 0),
      impressions: Number(r.impressions ?? 0),
      frequency: r.frequency ? Number(r.frequency) : null,
      leads: leadsFrom(r.actions),
      synced_at: new Date().toISOString(),
    }));

    if (rows.length) {
      const { error: upErr } = await supabase
        .from("adset_metrics_daily")
        .upsert(rows, { onConflict: "client_id,date,adset_id,ad_id" });
      if (upErr) throw upErr;
      upserted += rows.length;
    }
  }
  return { clients: clients?.length ?? 0, upserted, datePreset };
}

// app/api/sync/meta/route.ts (sketch):
//   export async function GET(req: Request) {
//     if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
//       return new Response("unauthorized", { status: 401 });
//     const backfill = new URL(req.url).searchParams.get("backfill") === "1";
//     return Response.json(await syncMeta({ backfill }));
//   }
