import type { TeamColors } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Text monogram chip — we do NOT scrape or hotlink team logos (§4).
 * The team colour fills this tiny chip; the label colour is picked from the
 * chip's luminance so it always clears WCAG AA contrast.
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
        "inline-flex h-5 min-w-[24px] items-center justify-center rounded-[3px] border px-1 font-mono text-[10px] leading-none font-bold",
        className,
      )}
      style={{
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        color: readableOn(colors.primary),
      }}
    >
      {abbr}
    </span>
  );
}

/** WCAG relative luminance of a #rgb / #rrggbb colour. */
function relativeLuminance(hex: string): number {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw;
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value)) return 0;

  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * channel((value >> 16) & 255) +
    0.7152 * channel((value >> 8) & 255) +
    0.0722 * channel(value & 255)
  );
}

/** Near-black or white, whichever contrasts with the given colour. */
function readableOn(hex: string): string {
  return relativeLuminance(hex) > 0.45 ? "#0B0B0B" : "#FFFFFF";
}
