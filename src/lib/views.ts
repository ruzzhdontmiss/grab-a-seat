/**
 * View-model assembly: pairs games with their snapshots and turns them into the
 * `GameView` shape the pages render. Keeps DB reads and pure logic apart.
 */

import { getSnapshotsForGames, type GameWithRelations } from "@/lib/db/queries";
import { buildGameView, type GameView } from "@/lib/games";
import { getProvider } from "@/lib/providers";
import { groupBy } from "@/lib/utils";

function hasFeesData(providerId: string): boolean {
  return getProvider(providerId)?.hasFeesData ?? false;
}

/** Map of gameId -> GameView (with best price, listings and trends). */
export async function buildViews(
  games: GameWithRelations[],
): Promise<Map<string, GameView>> {
  const snapshots = await getSnapshotsForGames(games.map((game) => game.id));
  const byGame = groupBy(snapshots, (snapshot) => snapshot.gameId);

  const views = new Map<string, GameView>();
  for (const game of games) {
    views.set(game.id, buildGameView(game, byGame.get(game.id) ?? [], hasFeesData));
  }
  return views;
}

export async function buildView(game: GameWithRelations): Promise<GameView> {
  return (await buildViews([game])).get(game.id) as GameView;
}
