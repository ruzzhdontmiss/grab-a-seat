import { ImageResponse } from "next/og";

import { getTeamBySlug, getTeamSchedule } from "@/lib/db/queries";
import { formatCents, formatKickoff } from "@/lib/utils";
import { buildViews } from "@/lib/views";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FanTicket Hub — team schedule and all-in prices";

export const revalidate = 300;

const INK = "#0B0C0E";
const LINE = "#23262B";
const TEXT = "#F2F3F5";
const DIM = "#9BA1A9";
const VOLT = "#C8FF3D";

export default async function Image({
  params,
}: {
  params: Promise<{ league: string; team: string }>;
}) {
  const { team: teamSlug } = await params;
  const team = await getTeamBySlug(teamSlug);

  if (!team) {
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

  const schedule = await getTeamSchedule(team.id, { limit: 5 });
  const views = await buildViews(schedule);
  const next = schedule[0] ? views.get(schedule[0].id) : undefined;

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
        borderTop: `10px solid ${team.colors.primary}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            border: `1px solid ${LINE}`,
            borderTop: `4px solid ${team.colors.primary}`,
            color: team.colors.primary,
            padding: "6px 12px",
            borderRadius: 4,
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          {team.abbr}
        </div>
        <span style={{ fontSize: 16, color: DIM, letterSpacing: 3 }}>
          {team.league.toUpperCase()} · {team.conference.toUpperCase()}{" "}
          {team.division.toUpperCase()}
        </span>
      </div>

      <span
        style={{
          fontSize: 72,
          fontWeight: 700,
          marginTop: 40,
          lineHeight: 1.05,
          display: "flex",
        }}
      >
        {team.name}
      </span>
      <span style={{ fontSize: 26, color: DIM, marginTop: 8, display: "flex" }}>
        {team.city} · schedule &amp; all-in prices
      </span>

      <div style={{ display: "flex", flex: 1 }} />

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
          <span style={{ fontSize: 18, color: DIM, letterSpacing: 2 }}>NEXT GAME</span>
          <span style={{ fontSize: 30, display: "flex" }}>
            {next ? formatKickoff(next.game.startsAt) : "No games scheduled"}
          </span>
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}
        >
          <span style={{ fontSize: 18, color: DIM, letterSpacing: 2 }}>
            CHEAPEST ALL-IN
          </span>
          <span style={{ fontSize: 48, color: VOLT, fontWeight: 700, display: "flex" }}>
            {next?.bestAllIn != null ? formatCents(next.bestAllIn) : "—"}
          </span>
        </div>
      </div>
    </div>,
    { ...size },
  );
}
