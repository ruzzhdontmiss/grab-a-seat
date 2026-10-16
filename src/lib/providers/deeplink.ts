/**
 * Deeplink providers (roadmap §5): StubHub, Vivid Seats, TickPick, Gametime.
 *
 * None of these expose a public listing/price API, so they carry no prices —
 * the UI renders a plain "View on {Provider} →" CTA and hides the price column.
 * If partner access is approved later, flip one of these to `inventory` and add
 * a real `getQuote` (the architecture makes that a one-file change).
 *
 * The search URLs below are the providers' public search pages, used as the
 * deeplink target until an approved affiliate link template exists (see the
 * README partner runbook). They are intentionally easy to swap in one place.
 */

import type {
  GameContext,
  NormalizedEvent,
  NormalizedQuote,
  ProviderId,
  TeamRef,
  TicketProvider,
} from "./base";
import { mockDeeplinkFor } from "./mock";

interface DeeplinkConfig {
  id: ProviderId;
  name: string;
  siteUrl: string;
  searchUrl: (query: string) => string;
}

const CONFIGS: DeeplinkConfig[] = [
  {
    id: "stubhub",
    name: "StubHub",
    siteUrl: "https://www.stubhub.com",
    searchUrl: (q) => `https://www.stubhub.com/search/?q=${encodeURIComponent(q)}`,
  },
  {
    id: "vividseats",
    name: "Vivid Seats",
    siteUrl: "https://www.vividseats.com",
    searchUrl: (q) =>
      `https://www.vividseats.com/search?searchTerm=${encodeURIComponent(q)}`,
  },
  {
    id: "tickpick",
    name: "TickPick",
    siteUrl: "https://www.tickpick.com",
    searchUrl: (q) => `https://www.tickpick.com/search/?q=${encodeURIComponent(q)}`,
  },
  {
    id: "gametime",
    name: "Gametime",
    siteUrl: "https://gametime.co",
    searchUrl: (q) => `https://gametime.co/search?q=${encodeURIComponent(q)}`,
  },
];

function matchupQuery(game: GameContext): string {
  return `${game.away.name} at ${game.home.name}`;
}

export function createDeeplinkProvider(config: DeeplinkConfig): TicketProvider {
  return {
    id: config.id,
    name: config.name,
    type: "deeplink",
    hasFeesData: false,
    siteUrl: config.siteUrl,
    // No live API in Phase 1 — links come from fixtures / public search URLs.
    usesMock: () => true,

    async getGames(_team: TeamRef): Promise<NormalizedEvent[]> {
      void _team;
      return [];
    },

    async getQuote(_game: GameContext): Promise<NormalizedQuote | null> {
      void _game;
      return null;
    },

    deeplinkFor(game: GameContext): string {
      return (
        mockDeeplinkFor(config.id, game.slug) ?? config.searchUrl(matchupQuery(game))
      );
    },
  };
}

export const DEEPLINK_CONFIGS = CONFIGS;
