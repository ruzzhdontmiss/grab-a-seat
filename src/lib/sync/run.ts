/**
 * Sync job (roadmap §1.3): refresh quotes for games in the next 30 days and
 * append `price_snapshots` rows, with a `sync_log` row per provider.
 *
 * Reliability rules (§8): every provider call is wrapped in try/catch, failures
 * are recorded in `sync_log` and never abort the run or blank the site — the UI
 * always reads the last good snapshot.
 */

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { games as gamesTable, priceSnapshots, syncLog } from "@/lib/db/schema";
import { getUpcomingGames } from "@/lib/db/queries";
import { toGameContext } from "@/lib/games";
import { inventoryProviders, type TicketProvider } from "@/lib/providers";

const SYNC_WINDOW_DAYS = 30;
const CONCURRENCY = 5;

export interface ProviderSyncResult {
  providerId: string;
  mocked: boolean;
  inserted: number;
  errors: number;
  status: "ok" | "error";
  error?: string;
}

export interface SyncSummary {
  startedAt: string;
  finishedAt: string;
  games: number;
  mocked: boolean;
  providers: ProviderSyncResult[];
}

/** Run `fn` over `items` with a bounded number of in-flight promises. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

async function syncProvider(
  provider: TicketProvider,
  incoming: Awaited<ReturnType<typeof getUpcomingGames>>,
): Promise<ProviderSyncResult> {
  const mocked = provider.usesMock();
  const [logRow] = await db
    .insert(syncLog)
    .values({ job: "sync", providerId: provider.id, status: "running" })
    .returning({ id: syncLog.id });

  let inserted = 0;
  let errors = 0;
  const messages: string[] = [];

  await mapWithConcurrency(incoming, CONCURRENCY, async (game) => {
    try {
      const quote = await provider.getQuote(toGameContext(game));
      if (!quote) return;

      await db.insert(priceSnapshots).values({
        gameId: game.id,
        providerId: provider.id,
        minCents: quote.minPriceCents,
        maxCents: null,
        allInMinCents: quote.allInCents,
        listingCount: quote.listingCount,
        fetchedAt: quote.fetchedAt,
      });
      inserted += 1;

      // Cheap, non-destructive cache refresh on the games row.
      if (game.status === "scheduled" && (quote.listingCount ?? 0) > 0 && !mocked) {
        await db
          .update(gamesTable)
          .set({ status: "onsale" })
          .where(eq(gamesTable.id, game.id));
      }
    } catch (error) {
      errors += 1;
      messages.push(
        `${game.slug}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });

  const error = messages.length > 0 ? messages.slice(0, 5).join(" | ") : null;

  await db
    .update(syncLog)
    .set({
      finishedAt: new Date(),
      status: errors > 0 && inserted === 0 ? "error" : "ok",
      rowCount: inserted,
      error,
    })
    .where(eq(syncLog.id, logRow.id));

  return {
    providerId: provider.id,
    mocked,
    inserted,
    errors,
    status: errors > 0 && inserted === 0 ? "error" : "ok",
    error: error ?? undefined,
  };
}

export async function runSync({ now = new Date() } = {}): Promise<SyncSummary> {
  const startedAt = new Date();
  const to = new Date(now.getTime() + SYNC_WINDOW_DAYS * 86_400_000);

  const incoming = await getUpcomingGames({ from: now, to, limit: 500 });
  const providers = inventoryProviders();

  const providerResults = await mapWithConcurrency(providers, 2, (provider) =>
    syncProvider(provider, incoming),
  );

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    games: incoming.length,
    mocked: providerResults.some((result) => result.mocked),
    providers: providerResults,
  };
}
