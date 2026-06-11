// Shared types for the Morning Scan (Pillar 0).
// Kept framework-free so both the server (dataSources.ts) and the client
// component can import them.

import type { FlagResult } from "@/lib/killFlag";

/** Rolling windows, in days, that the scan can be viewed over. Always includes today. */
export type ScanWindow = 1 | 3 | 5 | 7 | 30;
export const SCAN_WINDOWS: { days: ScanWindow; label: string }[] = [
  { days: 1, label: "Today" },
  { days: 3, label: "3d" },
  { days: 5, label: "5d" },
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
];

/** One ad set in the action queue, already evaluated by killFlag.ts. */
export interface ScanRow {
  clientId: string;
  clientName: string;
  adsetName: string;
  offerValue: number;
  roasTarget: number;
  /** Aggregated spend over the selected window. */
  spend: number;
  /** Aggregated leads over the selected window. */
  leads: number;
  result: FlagResult;
}

/** Per-client cost rollup for the "Cost & ROAS by client" table. */
export interface ClientCost {
  clientId: string;
  name: string;
  offerValue: number | null;
  roasTarget: number;
  spend: number;
  leads: number;
  cpl: number | null;
  bookings: number | null;
  cpb: number | null;
  revenue: number | null;
  roas: number | null;
  tracksPipeline: boolean;
}

/** Agency revenue & retention strip (Pillar 2.5 surface; real figures from the ledger). */
export interface AgencyMetrics {
  mrr: number;
  avgRetainer: number;
  activeClients: number;
  /** Monthly churn %, null until start/end dates are seeded. */
  monthlyChurnPct: number | null;
  sinceJan: string;
  newViaAds: string;
}

/** An action recorded against the queue (writes to actions_log when live). */
export interface ActionEntry {
  clientId?: string;
  adsetName?: string;
  action: string;
  reason?: string;
  cplBefore?: number | null;
  doneBy?: string;
}
