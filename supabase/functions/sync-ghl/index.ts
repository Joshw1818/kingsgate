// Supabase Edge Function — pulls recent GHL contacts (leads) and calendar
// appointments (bookings) per client and upserts into ghl_events. Then
// refreshes daily_kpis for affected dates.
//
// Invoked every 15 minutes by pg_cron.

import {
  daysAgoISO,
  getServiceClient,
  jsonResponse,
  todayISO,
} from "../_shared/supabase.ts";

const GHL_BASE = Deno.env.get("GHL_API_BASE") ?? "https://services.leadconnectorhq.com";
const GHL_KEY = Deno.env.get("GHL_AGENCY_API_KEY")!;
const GHL_VERSION = "2021-07-28";

async function ghlFetch(path: string): Promise<any> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${GHL_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${GHL_KEY}`,
        Version: GHL_VERSION,
        Accept: "application/json",
      },
    });
    if (res.ok) return await res.json();
    if (res.status === 429 || res.status >= 500) {
      const wait = 2 ** attempt * 1000;
      console.warn(
        `GHL rate limit / transient error (${res.status}) on ${path}, retrying in ${wait}ms`
      );
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    throw new Error(`GHL ${res.status}: ${await res.text()}`);
  }
  throw new Error(`GHL failed after retries: ${path}`);
}

interface GhlContact {
  id: string;
  dateAdded?: string;
  tags?: string[];
}

interface GhlAppointment {
  id: string;
  contactId: string;
  startTime?: string;
  appointmentStatus?: string;
}

Deno.serve(async () => {
  const supabase = getServiceClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, ghl_location_id")
    .eq("active", true);
  if (error) return jsonResponse({ error: error.message }, 500);

  const sinceDate = daysAgoISO(7);
  const results: Record<string, unknown> = {};

  for (const client of clients ?? []) {
    try {
      // 1. Leads — contacts created in last 7 days
      const contactsBody = await ghlFetch(
        `/contacts/?locationId=${client.ghl_location_id}&startAfter=${sinceDate}&limit=100`
      );
      const contacts: GhlContact[] = contactsBody.contacts ?? [];

      const leadEvents = contacts
        .filter((c) => c.dateAdded)
        .map((c) => ({
          client_id: client.id,
          event_type: "lead" as const,
          contact_id: c.id,
          occurred_at: c.dateAdded,
          raw: c,
        }));

      // 2. Bookings — calendar appointments in last 7 days
      const apptsBody = await ghlFetch(
        `/calendars/events?locationId=${client.ghl_location_id}&startTime=${sinceDate}T00:00:00Z&endTime=${todayISO()}T23:59:59Z`
      );
      const appts: GhlAppointment[] = apptsBody.events ?? [];

      const bookingEvents = appts
        .filter((a) => a.startTime)
        .map((a) => ({
          client_id: client.id,
          event_type: "booking" as const,
          contact_id: a.contactId,
          occurred_at: a.startTime,
          raw: a,
        }));

      // Also map "showed" status -> show events
      const showEvents = appts
        .filter((a) => a.appointmentStatus === "showed" && a.startTime)
        .map((a) => ({
          client_id: client.id,
          event_type: "show" as const,
          contact_id: a.contactId,
          occurred_at: a.startTime,
          raw: a,
        }));

      const allEvents = [...leadEvents, ...bookingEvents, ...showEvents];

      if (allEvents.length > 0) {
        const { error: upsertError } = await supabase
          .from("ghl_events")
          .upsert(allEvents, {
            onConflict: "client_id,contact_id,event_type",
          });
        if (upsertError) throw upsertError;
      }

      // Refresh rollups for each affected date (past 7 days is cheap)
      for (let i = 0; i < 7; i++) {
        await supabase.rpc("refresh_daily_kpi", {
          p_client_id: client.id,
          p_date: daysAgoISO(i),
        });
      }

      results[client.id] = {
        leads: leadEvents.length,
        bookings: bookingEvents.length,
        shows: showEvents.length,
      };
    } catch (err) {
      console.error(`sync-ghl failed for ${client.id}`, err);
      results[client.id] = {
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return jsonResponse({ ok: true, results });
});
