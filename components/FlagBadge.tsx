import type { FlagSeverity, FlagType } from "@/lib/supabase/types";
import { FLAG_LABELS } from "@/lib/flags";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<FlagSeverity, string> = {
  high: "bg-red-50 text-severity-high ring-red-200",
  medium: "bg-amber-50 text-severity-medium ring-amber-200",
  low: "bg-yellow-50 text-severity-low ring-yellow-200",
};

export function FlagBadge({
  flagType,
  severity,
}: {
  flagType: FlagType;
  severity: FlagSeverity;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1",
        SEVERITY_STYLES[severity]
      )}
    >
      {FLAG_LABELS[flagType]}
    </span>
  );
}

export function HealthDot({ label }: { label: "healthy" | "watch" | "critical" }) {
  const styles =
    label === "critical"
      ? "bg-severity-high"
      : label === "watch"
      ? "bg-severity-medium"
      : "bg-severity-ok";
  return <span className={cn("inline-block h-2 w-2 rounded-full", styles)} />;
}
