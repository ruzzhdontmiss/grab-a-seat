/**
 * Simulate a price drop in dev — `pnpm sim:drop`
 *
 * The Phase 1 DoD asks for this explicitly: with Mock fixtures we inject a
 * snapshot pair (a higher baseline, then a lower current price), run the alerts
 * engine, and show exactly which alert fired. With no RESEND_API_KEY the email
 * is rendered to `.email-outbox/` instead of being sent.
 *
 *   pnpm sim:drop                                  # Bears' next home game, to $45
 *   pnpm sim:drop -- --game=nba-...-2026-10-18 --to=38
 *   pnpm sim:drop -- --digest                      # exercise the digest lane
 */

import "./env";

import { asc, desc, eq } from "drizzle-orm";

import { db } from "../src/lib/db";
import { games, priceSnapshots, teams } from "../src/lib/db/schema";
import { runAlerts } from "../src/lib/alerts/engine";
import { formatCents } from "../src/lib/utils";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found?.slice(prefix.length);
}

const PROVIDER_ID = "seatgeek";
const ESTIMATE_RATE = 0.2;

/** all-in -> base, inverting the §5 estimate so the total lands on the target. */
function baseFromAllIn(allInCents: number): number {
  return Math.round(allInCents / (1 + ESTIMATE_RATE));
}

async function pickGame(): Promise<{ id: string; slug: string }> {
  const explicit = arg("game");
  if (explicit) {
    const row = await db.query.games.findFirst({ where: eq(games.slug, explicit) });
    if (!row) throw new Error(`No game with slug "${explicit}"`);
    return { id: row.id, slug: row.slug };
  }

  // Default to the Bears' next home game — the Phase 1 DoD path.
  const bears = await db.query.teams.findFirst({
    where: eq(teams.slug, "chicago-bears"),
  });
  if (bears) {
    const nextHome = await db.query.games.findFirst({
      where: eq(games.homeTeamId, bears.id),
      orderBy: [asc(games.startsAt)],
    });
    if (nextHome) return { id: nextHome.id, slug: nextHome.slug };
  }

  const [fallback] = await db.select().from(games).limit(1);
  if (!fallback)
    throw new Error("No games in the database — run `pnpm db:seed` first.");
  return { id: fallback.id, slug: fallback.slug };
}

async function main() {
  const targetCents = Math.round(Number.parseFloat(arg("to") ?? "45") * 100);
  const dropPct = Number.parseInt(arg("pct") ?? "20", 10);
  const digest = process.argv.includes("--digest");

  const game = await pickGame();
  console.log(`→ Game: ${game.slug}`);

  const [latest] = await db
    .select()
    .from(priceSnapshots)
    .where(eq(priceSnapshots.gameId, game.id))
    .orderBy(desc(priceSnapshots.fetchedAt))
    .limit(1);

  // Baseline: whatever we last saw, or a synthetic "before" price derived from
  // the target so the drop percentage is meaningful.
  const baselineAllIn =
    latest?.allInMinCents ?? Math.round(targetCents / (1 - dropPct / 100));
  const baselineBase = latest?.minCents ?? baseFromAllIn(baselineAllIn);

  // Guarantee a real move: land on the target, or drop `pct` from the baseline
  // when we are already at/below it — so re-running always shows a drop.
  const droppedAllIn = Math.min(
    targetCents,
    Math.round(baselineAllIn * (1 - dropPct / 100)),
  );

  const now = new Date();
  const baselineAt = new Date(now.getTime() - 3 * 3_600_000);

  await db.insert(priceSnapshots).values({
    gameId: game.id,
    providerId: PROVIDER_ID,
    minCents: baselineBase,
    maxCents: null,
    allInMinCents: baselineAllIn,
    listingCount: latest?.listingCount ?? 500,
    fetchedAt: baselineAt,
  });

  const droppedBase = baseFromAllIn(droppedAllIn);
  await db.insert(priceSnapshots).values({
    gameId: game.id,
    providerId: PROVIDER_ID,
    minCents: droppedBase,
    maxCents: null,
    allInMinCents: droppedAllIn,
    listingCount: (latest?.listingCount ?? 500) + 120,
    fetchedAt: now,
  });

  const pct = Math.round(((baselineAllIn - droppedAllIn) / baselineAllIn) * 100);
  console.log(
    `→ Inserted snapshots: ${formatCents(baselineAllIn)} -> ${formatCents(
      droppedAllIn,
    )} (-${pct}%)`,
  );

  const summary = await runAlerts({ now, digest });
  console.log("→ Alerts run:", JSON.stringify(summary, null, 2));

  if (summary.created === 0) {
    console.log(
      "\nNo alerts fired — either there are no targets yet, or everyone is\n" +
        "inside the 6-hour per-game cap. To create a target:\n" +
        "  • follow a team from /nfl\n" +
        "  • set a threshold on /game/" +
        game.slug,
    );
  } else {
    console.log(
      `\n✔ ${summary.created} alert event(s) created, ${summary.delivered} sent.` +
        (summary.mocked ? " Check .email-outbox/ for the rendered email." : ""),
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("✖ sim:drop failed:", error);
    process.exit(1);
  });
