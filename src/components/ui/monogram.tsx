import type { TeamColors } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Text monogram chip — we do NOT scrape or hotlink team logos (§4).
 * Team colour is used only here (tiny chip) and as a 2px top border.
 */
export function TeamMonogram({
  abbr,
  colors,
  className,
}: {
  abbr: string;
  colors: TeamColors;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-5 min-w-[24px] items-center justify-center rounded-[3px] border border-line px-1 font-mono text-[10px] font-medium leading-none",
        className,
      )}
      style={{
        borderTopColor: colors.primary,
        borderTopWidth: 2,
        color: colors.primary,
      }}
    >
      {abbr}
    </span>
  );
}
