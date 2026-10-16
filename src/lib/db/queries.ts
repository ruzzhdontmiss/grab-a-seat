/**
 * Read queries (roadmap §3 `lib/db/queries.ts`).
 *
 * Uses Drizzle's relational query API (`db.query.*`) so callers get nested
 * game → homeTeam / awayTeam / venue shapes without manual joins.
 */

import { and, asc, desc, eq, gte, inArray, lte, or } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  alertEvents,
  follows,
  games,
  priceSnapshots,
  teams,
  trackedGames,
  users,
} from "./schema";

const GAME_WITH = {
  homeTeam: true,
  awayTeam: true,
  venue: true,
} as const;

export type TeamRow = typeof teams.$inferSelect;
export type SnapshotRow = typeof priceSnapshots.$inferSelect;

/* ── Games ───────────────────────────────────────────────────────────────── */

export async function getGameBySlug(slug: string) {
  return db.query.games.findFirst({
    where: eq(games.slug, slug),
    with: GAME_WITH,
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getGameById(id: string) {
  // Guard against non-UUID input so a bad `?game=` never reaches Postgres
  // (which would throw a 22P02 instead of a clean miss).
  if (!UUID_RE.test(id)) return null;
  return db.query.games.findFirst({ where: eq(games.id, id), with: GAME_WITH });
}

export type GameWithRelations = NonNullable<Awaited<ReturnType<typeof getGameBySlug>>>;

/** Upcoming games in a window, optionally scoped to a league. */
export async function getUpcomingGames(
  options: {
    from?: Date;
    to?: Date;
    league?: "nfl" | "nba";
    limit?: number;
  } = {},
): Promise<GameWithRelations[]> {
  const from = options.from ?? new Date();
  const clauses = [gte(games.startsAt, from)];
  if (options.to) clauses.push(lte(games.startsAt, options.to));
  if (options.league) clauses.push(eq(games.league, options.league));

  return db.query.games.findMany({
    where: and(...clauses),
    orderBy: [asc(games.startsAt)],
    limit: options.limit ?? 200,
    with: GAME_WITH,
  });
}

/** A team's schedule (home or away), soonest first. */
export async function getTeamSchedule(
  teamId: string,
  options: { from?: Date; limit?: number } = {},
): Promise<GameWithRelations[]> {
  const from = options.from ?? new Date(Date.now() - 3 * 3_600_000);
  return db.query.games.findMany({
    where: and(
      gte(games.startsAt, from),
      or(eq(games.homeTeamId, teamId), eq(games.awayTeamId, teamId)),
    ),
    orderBy: [asc(games.startsAt)],
    limit: options.limit ?? 30,
    with: GAME_WITH,
  });
}

/* ── Teams ───────────────────────────────────────────────────────────────── */

export async function getTeamsByLeague(league: "nfl" | "nba"): Promise<TeamRow[]> {
  return db
    .select()
    .from(teams)
    .where(eq(teams.league, league))
    .orderBy(asc(teams.city));
}

export async function getAllTeams(): Promise<TeamRow[]> {
  return db.select().from(teams).orderBy(asc(teams.league), asc(teams.city));
}

export async function getTeamBySlug(slug: string): Promise<TeamRow | undefined> {
  return db.query.teams.findFirst({ where: eq(teams.slug, slug) });
}

export async function getTeamsByIds(ids: string[]): Promise<TeamRow[]> {
  if (ids.length === 0) return [];
  return db.select().from(teams).where(inArray(teams.id, ids));
}

/* ── Price snapshots ─────────────────────────────────────────────────────── */

/**
 * All snapshots for a set of games.
 *
 * At MVP scale (tens of games) reducing this in JS is simpler and type-safe than
 * a DISTINCT ON query; Phase 2 can push the aggregation into SQL.
 */
export async function getSnapshotsForGames(gameIds: string[]): Promise<SnapshotRow[]> {
  if (gameIds.length === 0) return [];
  return db
    .select()
    .from(priceSnapshots)
    .where(inArray(priceSnapshots.gameId, gameIds))
    .orderBy(desc(priceSnapshots.fetchedAt));
}

export async function getSnapshotsForGame(
  gameId: string,
  limit = 200,
): Promise<SnapshotRow[]> {
  return db
    .select()
    .from(priceSnapshots)
    .where(eq(priceSnapshots.gameId, gameId))
    .orderBy(desc(priceSnapshots.fetchedAt))
    .limit(limit);
}

/* ── User-facing reads ───────────────────────────────────────────────────── */

export async function getUserFollows(userId: string) {
  return db.query.follows.findMany({
    where: eq(follows.userId, userId),
    with: { team: true },
    orderBy: [asc(follows.createdAt)],
  });
}

export async function getUserTrackedGames(userId: string) {
  return db.query.trackedGames.findMany({
    where: eq(trackedGames.userId, userId),
    with: { game: { with: GAME_WITH } },
    orderBy: [desc(trackedGames.createdAt)],
  });
}

export async function getUserAlertHistory(userId: string, limit = 25) {
  return db.query.alertEvents.findMany({
    where: eq(alertEvents.userId, userId),
    with: { game: { with: GAME_WITH } },
    orderBy: [desc(alertEvents.sentAt), desc(alertEvents.id)],
    limit,
  });
}

export async function isFollowingTeam(userId: string, teamId: string) {
  const row = await db.query.follows.findFirst({
    where: and(eq(follows.userId, userId), eq(follows.teamId, teamId)),
  });
  return Boolean(row);
}

/* ── Cron-job reads ──────────────────────────────────────────────────────── */

export async function getAllTrackedGames() {
  return db.query.trackedGames.findMany({
    with: { user: true, game: { with: GAME_WITH } },
  });
}

export async function getAllFollows() {
  return db.query.follows.findMany({ with: { user: true, team: true } });
}

export async function getUsersByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db.select().from(users).where(inArray(users.id, ids));
}

export async function countRecentAlertsForGame(
  userId: string,
  gameId: string,
  since: Date,
) {
  const rows = await db
    .select({ id: alertEvents.id })
    .from(alertEvents)
    .where(
      and(
        eq(alertEvents.userId, userId),
        eq(alertEvents.gameId, gameId),
        gte(alertEvents.sentAt, since),
      ),
    );
  return rows.length;
}
