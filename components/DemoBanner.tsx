import { isDemoMode } from "@/lib/demo";

export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <strong className="font-semibold">Demo mode.</strong> You're viewing
      sample data — no real Facebook Ads, GHL, or Supabase connection is
      required. Set the <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
      env var (and the rest from <code className="font-mono text-xs">.env.example</code>)
      to connect live data.
    </div>
  );
}
