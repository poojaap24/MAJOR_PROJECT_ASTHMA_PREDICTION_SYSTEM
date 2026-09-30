import { RISK_META, type RiskTier } from "@/lib/breathesafe";

export function RiskBadge({
  tier,
  size = "md",
  className = "",
}: {
  tier: RiskTier;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = RISK_META[tier];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-semibold ${meta.badge} ${
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"
      } ${className}`}
    >
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
