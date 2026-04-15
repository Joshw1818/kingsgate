// Supabase Edge Function — pulls last 7 days of Facebook Ads insights per
// client and upserts into fb_insights_daily, then refreshes daily_kpis.
//
// Invoked every 30 minutes by pg_cron (see migrations/0002_cron.sql).

import {
  daysAgoISO,
  getServiceClient,
  jsonResponse,
  todayISO,
} from "../_shared/supabase.ts";

const FB_API_VERSION = Deno.env.get("FB_API_VERSION") ?? "v21.0";
const FB_TOKEN = Deno.env.get("FB_SYSTEM_USER_TOKEN")!;

interface FbInsightsRow {
  date_start: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpm?: string;
  cpc?: string;
  frequency?: string;
  reach?: string;
  actions?: { action_type: string; value: string }[];
}

async function fetchFbInsights(
  accountId: string
): Promise<FbInsightsRow[]> {
  const fields = [
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "cpm",
    "cpc",
    "frequency",
    "reach",
    "actions",
  ].join(",");
  const url = new URL(
    `https://graph.facebook.com/${FB_API_VERSION}/${accountId}/insights`
  );
  url.searchParams.set("access_token", FB_TOKEN);
  url.searchParams.set("fields", fields);
  url.searchParams.set("time_increment", "1");
  url.searchParams.set("date_preset", "last_7d");
  url.searchParams.set("level", "account");

  // Retry with exponential backoff on rate limits / transient errors.
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url.toString());
    if (res.ok) {
      const body = await res.json();
      return body.data ?? [];
    }
    if (res.status === 429 || res.status >= 500) {
      const wait = 2 ** attempt * 1000;
      console.warn(
        `FB rate limit / transient error (${res.status}) for ${accountId}, retrying in ${wait}ms`
      );
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    const errText = await res.text();
    throw new Error(`FB API error ${res.status}: ${errText}`);
  }
  throw new Error(`FB API failed after retries for ${accountId}`);
}

function extractLeads(actions: FbInsightsRow["actions"]): number {
  if (!actions) return 0;
  const lead = actions.find(
    (a) =>
      a.action_type === "lead" ||
      a.action_type === "onsite_conversion.lead_grouped" ||
      a.action_type === "offsite_conversion.fb_pixel_lead"
  );
  return lead ? Number(lead.value) : 0;
}

// ------------------------------------------------------------------
// Ad-level fetch — powers the smarter AI analysis. Returns one row per
// ad per day with creative sub-fields included inline.
// ------------------------------------------------------------------
interface FbAdInsightsRow {
  date_start: string;
  ad_id: string;
  ad_name?: string;
  adset_id?: string;
  campaign_id?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  frequency?: string;
  actions?: { action_type: string; value: string }[];
  creative?: {
    id?: string;
    title?: string;
    body?: string;
    thumbnail_url?: string;
    image_url?: string;
    call_to_action_type?: string;
  };
}

async function fetchFbAdInsights(
  accountId: string
): Promise<FbAdInsightsRow[]> {
  const fields = [
    "ad_id",
    "ad_name",
    "adset_id",
    "campaign_id",
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "cpc",
    "cpm",
    "frequency",
    "actions",
    "creative{id,title,body,thumbnail_url,image_url,call_to_action_type}",
  ].join(",");
  const url = new URL(
    `https://graph.facebook.com/${FB_API_VERSION}/${accountId}/insights`
  );
  url.searchParams.set("access_token", FB_TOKEN);
  url.searchParams.set("fields", fields);
  url.searchParams.set("time_increment", "1");
  url.searchParams.set("date_preset", "last_7d");
  url.searchParams.set("level", "ad");
  url.searchParams.set("limit", "200");

  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url.toString());
    if (res.ok) {
      const body = await res.json();
      return body.data ?? [];
    }
    if (res.status === 429 || res.status >= 500) {
      const wait = 2 ** attempt * 1000;
      console.warn(
        `FB ad-level rate limit / transient error (${res.status}) for ${accountId}, retrying in ${wait}ms`
      );
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    throw new Error(`FB ad-level API error ${res.status}: ${await res.text()}`);
  }
  throw new Error(`FB ad-level API failed after retries for ${accountId}`);
}

Deno.serve(async () => {
  const supabase = getServiceClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, fb_ad_account_id")
    .eq("active", true);

  if (error) return jsonResponse({ error: error.message }, 500);

  const results: Record<string, unknown> = {};

  for (const client of clients ?? []) {
    try {
      const rows = await fetchFbInsights(client.fb_ad_account_id);
      const upserts = rows.map((r) => ({
        client_id: client.id,
        date: r.date_start,
        spend: Number(r.spend ?? 0),
        impressions: Number(r.impressions ?? 0),
        clicks: Number(r.clicks ?? 0),
        ctr: Number(r.ctr ?? 0) / 100, // FB returns CTR as percent
        cpm: Number(r.cpm ?? 0),
        cpc: Number(r.cpc ?? 0),
        frequency: Number(r.frequency ?? 0),
        reach: Number(r.reach ?? 0),
        fb_reported_leads: extractLeads(r.actions),
        raw: r,
        updated_at: new Date().toISOString(),
      }));

      if (upserts.length > 0) {
        const { error: upsertError } = await supabase
          .from("fb_insights_daily")
          .upsert(upserts, { onConflict: "client_id,date" });
        if (upsertError) throw upsertError;
      }

      // Ad-level pull (best-effort — don't fail the whole sync if this 500s)
      let adRows = 0;
      try {
        const ads = await fetchFbAdInsights(client.fb_ad_account_id);
        const adUpserts = ads.map((a) => ({
          client_id: client.id,
          date: a.date_start,
          ad_id: a.ad_id,
          adset_id: a.adset_id ?? null,
          campaign_id: a.campaign_id ?? null,
          ad_name: a.ad_name ?? null,
          creative_id: a.creative?.id ?? null,
          thumbnail_url: a.creative?.thumbnail_url ?? a.creative?.image_url ?? null,
          headline: a.creative?.title ?? null,
          body_text: a.creative?.body ?? null,
          cta: a.creative?.call_to_action_type ?? null,
          spend: Number(a.spend ?? 0),
          impressions: Number(a.impressions ?? 0),
          clicks: Number(a.clicks ?? 0),
          ctr: Number(a.ctr ?? 0) / 100,
          cpc: Number(a.cpc ?? 0),
          cpm: Number(a.cpm ?? 0),
          frequency: Number(a.frequency ?? 0),
          fb_reported_leads: extractLeads(a.actions),
          raw: a,
          updated_at: new Date().toISOString(),
        }));
        if (adUpserts.length > 0) {
          const { error: adErr } = await supabase
            .from("fb_ad_insights_daily")
            .upsert(adUpserts, { onConflict: "client_id,date,ad_id" });
          if (adErr) throw adErr;
        }
        adRows = adUpserts.length;
      } catch (adErr) {
        console.warn(
          `ad-level sync failed for ${client.id} (non-fatal):`,
          adErr
        );
      }

      // Refresh rollup for today + yesterday (the days most likely to have
      // changed). The scheduled run also covers older days on first sync.
      for (const date of [daysAgoISO(1), todayISO()]) {
        await supabase.rpc("refresh_daily_kpi", {
          p_client_id: client.id,
          p_date: date,
        });
      }

      results[client.id] = { rows: upserts.length, ad_rows: adRows };
    } catch (err) {
      console.error(`sync-fb failed for ${client.id}`, err);
      results[client.id] = {
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return jsonResponse({ ok: true, results });
});
