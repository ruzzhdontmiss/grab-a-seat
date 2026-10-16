/**
 * Game/price domain helpers (roadmap §3, §7).
 *
 * Pure functions shared by pages, the sync job and the alerts engine so the
 * "cheapest all-in price" and "trend arrow" rules are defined exactly once.
 */

import type { GameWithRelations, SnapshotRow, TeamRow } from "@/lib/db/queries";
import type { GameContext, TeamRef } from "@/lib/providers/base";

export function toTeamRef(team: TeamRow): TeamRef {
  return {
    slug: team.slug,
    abbr: team.abbr,
    name: team.name,
    city: team.city,
    colors: team.colors,
    seatgeekSlug: team.seatgeekSlug,
    tmAttractionId: team.tmAttractionId,
  };
}

export function toGameContext(game: GameWithRelations): GameContext {
  return {
    id: game.id,
    slug: game.slug,
    league: game.league,
    startsAt: game.startsAt,
    status: game.status,
    venueName: game.venue?.name ?? null,
    venueCity: game.venue?.city ?? null,
    seatgeekEventId: game.seatgeekEventId,
    ticketmasterId: game.ticketmasterId,
    home: toTeamRef(game.homeTeam),
    away: toTeamRef(game.awayTeam),
  };
}

/** "PIT–CHI" */
export function matchupShort(game: { homeTeam: TeamRow; awayTeam: TeamRow }): string {
  return `${game.awayTeam.abbr}–${game.homeTeam.abbr}`;
}

/** "Pittsburgh Steelers at Chicago Bears" */
export function matchupLong(game: { homeTeam: TeamRow; awayTeam: TeamRow }): string {
  return `${game.awayTeam.name} at ${game.homeTeam.name}`;
}

/* ── Snapshot aggregation ────────────────────────────────────────────────── */

/** Most recent snapshot per provider. `rows` must be newest-first. */
export function latestPerProvider(rows: SnapshotRow[]): Map<string, SnapshotRow> {
  const out = new Map<string, SnapshotRow>();
  for (const row of rows) {
    if (!out.has(row.providerId)) out.set(row.providerId, row);
  }
  return out;
}

function minAllIn(rows: Iterable<SnapshotRow>): number | null {
  let best: number | null = null;
  for (const row of rows) {
    const value = row.allInMinCents;
    if (value === null || value === undefined) continue;
    if (best === null || value < best) best = value;
  }
  return best;
}

/** Cheapest all-in price right now, across the latest snapshot per provider. */
export function currentBestAllIn(rows: SnapshotRow[]): number | null {
  return minAllIn([...latestPerProvider(rows).values()]);
}

/** The winning provider row right now (cheapest all-in), or null. */
export function cheapestSnapshot(rows: SnapshotRow[]): SnapshotRow | null {
  let best: SnapshotRow | null = null;
  for (const row of latestPerProvider(rows).values()) {
    if (row.allInMinCents === null) continue;
    if (!best || (best.allInMinCents ?? Infinity) > row.allInMinCents) best = row;
  }
  return best;
}

export interface Trend {
  direction: "down" | "up" | "flat";
  /** Percentage change vs baseline; null when there is nothing to compare. */
  pct: number | null;
}

export function computeTrend(current: number | null, previous: number | null): Trend {
  if (current === null || previous === null || previous <= 0) {
    return { direction: "flat", pct: null };
  }
  const delta = current - previous;
  if (delta === 0) return { direction: "flat", pct: 0 };
  return {
    direction: delta < 0 ? "down" : "up",
    pct: Math.round((delta / previous) * 100),
  };
}

/** Trend vs the previous sync (all snapshots older than the latest tick). */
export function snapshotTrend(rows: SnapshotRow[]): Trend {
  const latest = latestPerProvider(rows);
  const latestKeys = new Set(
    [...latest.entries()].map(([id, row]) => `${id}:${row.fetchedAt.getTime()}`),
  );
  const current = minAllIn(latest.values());
  const previous = minAllIn(
    rows.filter(
      (row) => !latestKeys.has(`${row.providerId}:${row.fetchedAt.getTime()}`),
    ),
  );
  return computeTrend(current, previous);
}

/**
 * Trend vs N days ago (roadmap §7: "▼▲ vs 7d ago"). Falls back to the previous
 * sync when there is not yet a snapshot that old.
 */
export function trendVsDays(rows: SnapshotRow[], days = 7): Trend {
  const latest = latestPerProvider(rows);
  const current = minAllIn(latest.values());

  const cutoff = Date.now() - days * 86_400_000;
  const older = rows.filter((row) => row.fetchedAt.getTime() <= cutoff);
  if (older.length > 0) return computeTrend(current, minAllIn(older));

  return snapshotTrend(rows);
}

/** Lowest all-in price ever recorded for a game (for "lowest since" copy). */
export function lowestEver(rows: SnapshotRow[]): { cents: number; at: Date } | null {
  let best: { cents: number; at: Date } | null = null;
  for (const row of rows) {
    if (row.allInMinCents === null) continue;
    if (!best || row.allInMinCents < best.cents) {
      best = { cents: row.allInMinCents, at: row.fetchedAt };
    }
  }
  return best;
}

/** True when the current cheapest price equals the all-time low for the game. */
export function isLowestEver(rows: SnapshotRow[]): boolean {
  const current = currentBestAllIn(rows);
  const low = lowestEver(rows);
  return current !== null && low !== null && current <= low.cents;
}

/** The second-most-recent snapshot per provider. `rows` must be newest-first. */
export function previousPerProvider(rows: SnapshotRow[]): Map<string, SnapshotRow> {
  const seen = new Map<string, number>();
  const out = new Map<string, SnapshotRow>();
  for (const row of rows) {
    const count = seen.get(row.providerId) ?? 0;
    seen.set(row.providerId, count + 1);
    if (count === 1) out.set(row.providerId, row);
  }
  return out;
}

/** Cheapest all-in price at the previous sync, or null when unknown. */
export function previousBestAllIn(rows: SnapshotRow[]): number | null {
  return minAllIn(previousPerProvider(rows).values());
}

/** Total listings across the latest snapshot per provider. */
export function totalListings(rows: SnapshotRow[]): number {
  let total = 0;
  for (const row of latestPerProvider(rows).values()) {
    total += row.listingCount ?? 0;
  }
  return total;
}

/** Total listings at the previous sync. */
export function previousTotalListings(rows: SnapshotRow[]): number {
  let total = 0;
  for (const row of previousPerProvider(rows).values()) {
    total += row.listingCount ?? 0;
  }
  return total;
}

/* ── View models ─────────────────────────────────────────────────────────── */

export interface GameView {
  game: GameWithRelations;
  rows: SnapshotRow[];
  bestAllIn: number | null;
  bestProviderId: string | null;
  bestMinCents: number | null;
  bestFeesCents: number | null;
  bestListings: number | null;
  bestIsEstimate: boolean;
  listings: number;
  trend: Trend;
  trend7d: Trend;
}

/**
 * Everything a page needs about one game's prices. `getProvider` is imported
 * lazily to keep this module usable from plain Node scripts too.
 */
export function buildGameView(
  game: GameWithRelations,
  rows: SnapshotRow[],
  hasFeesData: (providerId: string) => boolean,
): GameView {
  const best = cheapestSnapshot(rows);
  return {
    game,
    rows,
    bestAllIn: best?.allInMinCents ?? null,
    bestProviderId: best?.providerId ?? null,
    bestMinCents: best?.minCents ?? null,
    bestFeesCents:
      best && best.minCents !== null && best.allInMinCents !== null
        ? best.allInMinCents - best.minCents
        : null,
    bestListings: best?.listingCount ?? null,
    bestIsEstimate: best ? !hasFeesData(best.providerId) : false,
    listings: totalListings(rows),
    trend: snapshotTrend(rows),
    trend7d: trendVsDays(rows, 7),
  };
}
