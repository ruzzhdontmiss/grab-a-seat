/**
 * Alert engine (roadmap §1.5).
 *
 *   1. diff the latest snapshot against the previous one per game
 *   2. create `alert_events` rows (dedupeKey = user+game+type+6h window)
 *   3. email the fan via Resend (React Email template)
 *
 * Free-tier rule: at most one email per game per 6 hours. The digest lane
 * batches every event detected in a run into one email per fan.
 */

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { alertEvents } from "@/lib/db/schema";
import {
  countRecentAlertsForGame,
  getAllFollows,
  getAllTrackedGames,
  getSnapshotsForGames,
  getUpcomingGames,
  type GameWithRelations,
  type SnapshotRow,
} from "@/lib/db/queries";
import { AlertDigestEmail, type DigestItem } from "@/lib/email/alert-digest";
import { PriceDropEmail } from "@/lib/email/price-drop";
import { sendEmail, type SendResult } from "@/lib/email/send";
import { env } from "@/lib/env";
import {
  cheapestSnapshot,
  lowestEver,
  matchupLong,
  previousBestAllIn,
  previousPerProvider,
  previousTotalListings,
  totalListings,
} from "@/lib/games";
import { getProvider } from "@/lib/providers";
import { formatCents } from "@/lib/utils";

export type AlertType = "price_drop" | "threshold" | "new_tickets" | "low_ever";

const DEFAULT_PCT_DROP = 10;
const DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000;
const SCAN_WINDOW_DAYS = 30;

export interface AlertsSummary {
  lane: "immediate" | "digest";
  scanned: number;
  created: number;
  delivered: number;
  skipped: number;
  mocked: boolean;
  errors: string[];
}

interface Target {
  userId: string;
  userName: string;
  userEmail: string;
  game: GameWithRelations;
  thresholdCents: number | null;
  pctDropThreshold: number | null;
  onPriceDrop: boolean;
  onNewTickets: boolean;
}

interface Candidate {
  target: Target;
  type: AlertType;
  headline: string;
  payload: Record<string, unknown>;
  best: SnapshotRow;
  current: number;
  previous: number | null;
  isEstimate: boolean;
}

function formatKickoff(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(date);
}

function isEstimated(
  snapshot: SnapshotRow,
  allIn: number,
  min: number | null,
): boolean {
  const provider = getProvider(snapshot.providerId);
  if (provider) return !provider.hasFeesData;
  return min !== null && allIn !== min;
}

function absolute(path: string): string {
  return new URL(path, env.BETTER_AUTH_URL).toString();
}

/* ── Target collection ───────────────────────────────────────────────────── */

async function collectTargets(now: Date): Promise<Target[]> {
  const [tracked, follows, upcoming] = await Promise.all([
    getAllTrackedGames(),
    getAllFollows(),
    getUpcomingGames({
      from: now,
      to: new Date(now.getTime() + SCAN_WINDOW_DAYS * 86_400_000),
      limit: 500,
    }),
  ]);

  const targets = new Map<string, Target>();

  for (const row of tracked) {
    targets.set(`${row.userId}:${row.gameId}`, {
      userId: row.userId,
      userName: row.user.name,
      userEmail: row.user.email,
      game: row.game,
      thresholdCents: row.thresholdCents,
      pctDropThreshold: row.pctDropThreshold,
      onPriceDrop: row.onPriceDrop,
      onNewTickets: row.onNewTickets,
    });
  }

  for (const follow of follows) {
    for (const game of upcoming) {
      if (game.homeTeamId !== follow.teamId && game.awayTeamId !== follow.teamId) {
        continue;
      }
      const key = `${follow.userId}:${game.id}`;
      if (targets.has(key)) continue;
      targets.set(key, {
        userId: follow.userId,
        userName: follow.user.name,
        userEmail: follow.user.email,
        game,
        thresholdCents: null,
        pctDropThreshold: null,
        onPriceDrop: true,
        onNewTickets: true,
      });
    }
  }

  return [...targets.values()];
}

/* ── Trigger evaluation ──────────────────────────────────────────────────── */

function evaluate(target: Target, rows: SnapshotRow[]): Candidate | null {
  const best = cheapestSnapshot(rows);
  if (!best || best.allInMinCents === null) return null;

  const current = best.allInMinCents;
  const previous = previousBestAllIn(rows);
  // "New tickets" only makes sense when we HAVE a prior snapshot to compare to —
  // otherwise every game looks new on the very first sync.
  const hasPrevious = previousPerProvider(rows).size > 0;
  const currentListings = totalListings(rows);
  const previousListings = previousTotalListings(rows);
  const allTimeLow = lowestEver(rows);
  const estimate = isEstimated(best, current, best.minCents);

  const pctChange =
    previous !== null && previous > 0
      ? Math.round(((previous - current) / previous) * 100)
      : null;

  // Priority order: an explicit threshold always wins, then a drop, then new
  // inventory, then an all-time low.
  let type: AlertType | null = null;
  let headline = "";

  if (target.thresholdCents !== null && current <= target.thresholdCents) {
    type = "threshold";
    headline = `Cleared your ${formatCents(target.thresholdCents)} target`;
  } else if (
    target.onPriceDrop &&
    previous !== null &&
    current < previous &&
    (pctChange ?? 0) >= (target.pctDropThreshold ?? DEFAULT_PCT_DROP)
  ) {
    type = "price_drop";
    headline = `Price dropped ${pctChange}%`;
  } else if (
    target.onNewTickets &&
    hasPrevious &&
    previousListings === 0 &&
    currentListings > 0
  ) {
    type = "new_tickets";
    headline = "New tickets listed";
  } else if (previous !== null && allTimeLow && current <= allTimeLow.cents) {
    type = "low_ever";
    headline = "Lowest price we've seen";
  }

  if (!type) return null;

  return {
    target,
    type,
    headline,
    current,
    previous,
    isEstimate: estimate,
    best,
    payload: {
      matchup: matchupLong(target.game),
      league: target.game.league,
      gameSlug: target.game.slug,
      venue: target.game.venue?.name ?? null,
      kickoff: target.game.startsAt.toISOString(),
      providerId: best.providerId,
      allInCents: current,
      previousCents: previous,
      minCents: best.minCents,
      listingCount: currentListings,
      pctChange,
      isEstimate: estimate,
    },
  };
}

/* ── Email rendering ─────────────────────────────────────────────────────── */

function gameEmailUrl(game: GameWithRelations): string {
  return absolute(`/game/${game.slug}`);
}

function ctaUrlFor(candidate: Candidate): string {
  return absolute(
    `/api/r/${candidate.best.providerId}?game=${candidate.target.game.id}`,
  );
}

function providerLabel(providerId: string): string {
  return getProvider(providerId)?.name ?? providerId;
}

async function sendImmediateAlert(candidate: Candidate): Promise<SendResult> {
  const { target, best } = candidate;
  return sendEmail({
    to: target.userEmail,
    subject: `${candidate.headline} — ${matchupLong(target.game)}`,
    element: PriceDropEmail({
      headline: candidate.headline,
      matchup: matchupLong(target.game),
      league: target.game.league,
      venue: target.game.venue?.name ?? null,
      kickoff: formatKickoff(target.game.startsAt),
      providerName: providerLabel(best.providerId),
      allInCents: candidate.current,
      previousCents: candidate.previous,
      isEstimate: candidate.isEstimate,
      ctaUrl: ctaUrlFor(candidate),
      ctaLabel: `View on ${providerLabel(best.providerId)}`,
      gameUrl: gameEmailUrl(target.game),
    }),
  });
}

/* ── Main entry point ────────────────────────────────────────────────────── */

export async function runAlerts({
  now = new Date(),
  digest = false,
}: { now?: Date; digest?: boolean } = {}): Promise<AlertsSummary> {
  const summary: AlertsSummary = {
    lane: digest ? "digest" : "immediate",
    scanned: 0,
    created: 0,
    delivered: 0,
    skipped: 0,
    mocked: false,
    errors: [],
  };

  const targets = await collectTargets(now);
  summary.scanned = targets.length;
  if (targets.length === 0) return summary;

  const gameIds = [...new Set(targets.map((target) => target.game.id))];
  const snapshots = await getSnapshotsForGames(gameIds);
  const byGame = new Map<string, SnapshotRow[]>();
  for (const row of snapshots) {
    const list = byGame.get(row.gameId);
    if (list) list.push(row);
    else byGame.set(row.gameId, [row]);
  }

  const window = Math.floor(now.getTime() / DEDUPE_WINDOW_MS);
  const since = new Date(now.getTime() - DEDUPE_WINDOW_MS);
  const created: Array<{ candidate: Candidate; eventId: string }> = [];

  for (const target of targets) {
    const candidate = evaluate(target, byGame.get(target.game.id) ?? []);
    if (!candidate) continue;

    const dedupeKey = `${target.userId}:${target.game.id}:${candidate.type}:${window}`;

    // Free tier: max one email per game per 6 hours.
    const recent = await countRecentAlertsForGame(target.userId, target.game.id, since);
    if (recent > 0) {
      summary.skipped += 1;
      continue;
    }

    const inserted = await db
      .insert(alertEvents)
      .values({
        userId: target.userId,
        gameId: target.game.id,
        type: candidate.type,
        payload: candidate.payload,
        channel: "email",
        sentAt: null,
        dedupeKey,
      })
      .onConflictDoNothing({ target: alertEvents.dedupeKey })
      .returning({ id: alertEvents.id });

    if (inserted.length === 0) {
      summary.skipped += 1;
      continue;
    }

    summary.created += 1;
    created.push({ candidate, eventId: inserted[0].id });

    if (!digest) {
      const result = await sendImmediateAlert(candidate);
      summary.mocked = summary.mocked || result.mocked;
      if (result.error) {
        summary.errors.push(`${dedupeKey}: ${result.error}`);
      } else {
        summary.delivered += 1;
      }
      await db
        .update(alertEvents)
        .set({ sentAt: new Date() })
        .where(eq(alertEvents.id, inserted[0].id));
    }
  }

  if (digest && created.length > 0) {
    const digestResult = await sendDigests(
      created.map((entry) => entry.candidate),
      now,
    );
    summary.delivered += digestResult.delivered;
    summary.mocked = summary.mocked || digestResult.mocked;
    summary.errors.push(...digestResult.errors);

    // Mark the queued events as delivered so they are not resent, and so the
    // per-game dedupe cap sees them on the next run.
    const deliveredAt = new Date();
    for (const entry of created) {
      await db
        .update(alertEvents)
        .set({ sentAt: deliveredAt })
        .where(eq(alertEvents.id, entry.eventId));
    }
  }

  return summary;
}

/** Send one digest email per fan for a batch of freshly detected events. */
async function sendDigests(
  candidates: Candidate[],
  now: Date,
): Promise<{ delivered: number; mocked: boolean; errors: string[] }> {
  const byUser = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const list = byUser.get(candidate.target.userId);
    if (list) list.push(candidate);
    else byUser.set(candidate.target.userId, [candidate]);
  }

  let delivered = 0;
  let mocked = false;
  const errors: string[] = [];

  const generatedFor = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(now);

  for (const [, userCandidates] of byUser) {
    const { target } = userCandidates[0];
    const items: DigestItem[] = userCandidates.map((candidate) => ({
      headline: candidate.headline,
      matchup: matchupLong(candidate.target.game),
      kickoff: formatKickoff(candidate.target.game.startsAt),
      providerName: providerLabel(candidate.best.providerId),
      allInCents: candidate.current,
      previousCents: candidate.previous,
      isEstimate: candidate.isEstimate,
      gameUrl: gameEmailUrl(candidate.target.game),
    }));

    const result = await sendEmail({
      to: target.userEmail,
      subject: `${items.length} ticket price ${items.length === 1 ? "move" : "moves"} for you`,
      element: AlertDigestEmail({
        recipientName: target.userName,
        generatedFor,
        items,
      }),
    });

    mocked = mocked || result.mocked;
    if (result.error) {
      errors.push(`${target.userEmail}: ${result.error}`);
      continue;
    }
    delivered += 1;
  }

  return { delivered, mocked, errors };
}
