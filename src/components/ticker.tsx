export interface TickerItem {
  id: string;
  /** Body text, e.g. "18% LAL–BOS · $71 → $58 · SeatGeek". */
  text: string;
  /** Movement tone — drives the arrow glyph and colour. */
  direction?: "down" | "up" | "flat";
}

const ARROW: Record<NonNullable<TickerItem["direction"]>, string> = {
  down: "▼",
  up: "▲",
  flat: "■",
};

const TONE: Record<NonNullable<TickerItem["direction"]>, string> = {
  down: "text-volt",
  up: "text-amber",
  flat: "text-text-dim",
};

/**
 * Live ticker strip (§4) — marquee of recent price moves across the very top of
 * every page. Pure CSS: pauses on hover/focus, honours prefers-reduced-motion.
 */
export function Ticker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;
  // Rendered twice so the -50% translate loops seamlessly.
  const sequence = [...items, ...items];

  return (
    <div className="ticker-viewport border-line bg-surface border-b" aria-hidden>
      <div className="ticker-track">
        {sequence.map((item, index) => (
          <span
            key={`${item.id}-${index}`}
            className="border-line-soft text-text-dim flex items-center gap-2 border-r px-4 py-1.5 font-mono text-[11px] whitespace-nowrap tabular-nums"
          >
            <span className={TONE[item.direction ?? "flat"]}>
              {ARROW[item.direction ?? "flat"]}
            </span>
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
