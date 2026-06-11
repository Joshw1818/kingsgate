import { getMorningScan, getClientCosts, getAgencyMetrics } from "@/lib/dataSources";
import { SCAN_WINDOWS, type ScanWindow, type ScanRow, type ClientCost } from "@/lib/scan/types";
import { MorningScanClient } from "./MorningScanClient";

// Reads go through dataSources.ts (Supabase → mock fallback). Never hits an API.
export const dynamic = "force-dynamic";

export default async function MorningScanPage() {
  const windows = SCAN_WINDOWS.map((w) => w.days);

  // Compute every window server-side (killFlag runs here, never in the browser);
  // the client just swaps between the pre-evaluated sets when a pill is clicked.
  const [scanResults, costResults, agency] = await Promise.all([
    Promise.all(windows.map((w) => getMorningScan(w))),
    Promise.all(windows.map((w) => getClientCosts(w))),
    getAgencyMetrics(),
  ]);

  const scansByWindow = {} as Record<ScanWindow, ScanRow[]>;
  const costsByWindow = {} as Record<ScanWindow, ClientCost[]>;
  windows.forEach((w, i) => {
    scansByWindow[w] = scanResults[i];
    costsByWindow[w] = costResults[i];
  });

  return (
    <MorningScanClient
      scansByWindow={scansByWindow}
      costsByWindow={costsByWindow}
      agency={agency}
    />
  );
}
