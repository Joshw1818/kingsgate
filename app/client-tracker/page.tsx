import { getClientTracker } from "@/lib/dataSources";
import { ClientTrackerClient } from "./ClientTrackerClient";

// Reads go through dataSources.ts (Supabase ledger → mock fallback). No API calls.
export const dynamic = "force-dynamic";

export default async function ClientTrackerPage() {
  const rows = await getClientTracker();
  return <ClientTrackerClient rows={rows} />;
}
