// Hand-rolled DB types. Regenerate with `supabase gen types typescript` if schema changes.

export type FlagSeverity = "low" | "medium" | "high";
export type FlagType =
  | "low_volume"
  | "cpl_over_target"
  | "cpb_over_target"
  | "conversion_rate_drop"
  | "ad_fatigue";
export type GhlEventType = "lead" | "booking" | "show" | "sale";
export type ReportWindow = "7d" | "30d";

export interface Client {
  id: string;
  name: string;
  fb_ad_account_id: string;
  ghl_location_id: string;
  target_cpl: number | null;
  target_cost_per_booking: number | null;
  monthly_budget: number | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyKpi {
  client_id: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  frequency: number;
  leads: number;
  bookings: number;
  shows: number;
  sales: number;
  cost_per_lead: number | null;
  cost_per_booking: number | null;
  booking_rate: number | null;
  show_rate: number | null;
  updated_at: string;
}

export interface Flag {
  id: string;
  client_id: string;
  flag_type: FlagType;
  severity: FlagSeverity;
  detected_at: string;
  resolved_at: string | null;
  metrics: Record<string, unknown> | null;
  diagnosis_md: string | null;
}

export interface Report {
  id: string;
  client_id: string | null;
  window: ReportWindow;
  share_token: string;
  generated_at: string;
  payload: Record<string, unknown>;
  ai_summary_md: string | null;
}

export interface FbInsightsDaily {
  client_id: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  frequency: number;
  reach: number;
  fb_reported_leads: number;
  raw: Record<string, unknown> | null;
  updated_at: string;
}
