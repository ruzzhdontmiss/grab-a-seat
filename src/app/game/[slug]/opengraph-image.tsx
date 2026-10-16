import { ImageResponse } from "next/og";

import { getGameBySlug } from "@/lib/db/queries";
import { matchupLong } from "@/lib/games";
import { formatCents, formatKickoff } from "@/lib/utils";
import { buildView } from "@/lib/views";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FanTicket Hub — all-in ticket prices";

export const revalidate = 300;

const INK = "#0B0C0E";
const LINE = "#23262B";
const TEXT = "#F2F3F5";
const DIM = "#9BA1A9";
const VOLT = "#C8FF3D";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          background: INK,
          color: TEXT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 56,
          fontWeight: 700,
        }}
      >
        FanTicket Hub
      </div>,
      { ...size },
    );
  }

  const view = await buildView(game);
  const best = view.bestAllIn !== null ? formatCents(view.bestAllIn) : "—";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: INK,
        color: TEXT,
        display: "flex",
        flexDirection: "column",
        padding: 64,
        border: `1px solid ${LINE}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            background: VOLT,
            color: INK,
            width: 44,
            height: 44,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          FT
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>
            FANTICKET HUB
          </span>
          <span style={{ fontSize: 15, color: DIM, letterSpacing: 3 }}>
            {game.league.toUpperCase()} · ALL-IN PRICE COMPARISON
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: 48,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 30, color: DIM, display: "flex" }}>
          {formatKickoff(game.startsAt)}
          {game.venue?.name ? ` · ${game.venue.name}` : ""}
        </span>
        <span
          style={{
            fontSize: 66,
            fontWeight: 700,
            marginTop: 12,
            lineHeight: 1.05,
            display: "flex",
          }}
        >
          {matchupLong(game)}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          borderTop: `1px solid ${LINE}`,
          paddingTop: 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 18, color: DIM, letterSpacing: 2 }}>
            CHEAPEST ALL-IN
          </span>
          <span style={{ fontSize: 54, color: VOLT, fontWeight: 700, display: "flex" }}>
            {best}
            {view.bestIsEstimate && view.bestAllIn !== null ? (
              <span style={{ fontSize: 22, color: DIM, marginLeft: 10 }}>est.</span>
            ) : null}
          </span>
        </div>
        <span style={{ fontSize: 20, color: DIM }}>
          {game.venue?.city ?? "NFL & NBA"}
        </span>
      </div>
    </div>,
    { ...size },
  );
}
