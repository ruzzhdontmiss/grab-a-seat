import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import type { Trend } from "@/lib/games";
import { cn } from "@/lib/utils";

/**
 * Trend arrow (roadmap §4, §7). Price down = volt (good for a fan);
 * price up = amber ("rising price only"); flat/dim otherwise.
 */
export function TrendArrow({
  trend,
  className,
  suffix,
}: {
  trend: Trend;
  className?: string;
  suffix?: string;
}) {
  if (trend.pct === null) {
    return (
      <span className={cn("text-text-dim font-mono text-[12px]", className)}>—</span>
    );
  }

  const Icon =
    trend.direction === "down" ? ArrowDown : trend.direction === "up" ? ArrowUp : Minus;
  const tone =
    trend.direction === "down"
      ? "text-volt"
      : trend.direction === "up"
        ? "text-amber"
        : "text-text-dim";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[12px] tabular-nums",
        tone,
        className,
      )}
    >
      <Icon size={12} strokeWidth={2.5} />
      {`${Math.abs(trend.pct)}%`}
      {suffix ? <span className="text-text-dim ml-0.5">{suffix}</span> : null}
    </span>
  );
}
