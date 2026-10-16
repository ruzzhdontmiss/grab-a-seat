/**
 * Provider abstraction (roadmap §3).
 *
 * Two kinds of provider:
 *   - `inventory`  returns real prices (SeatGeek, Ticketmaster).
 *   - `deeplink`   has no public price feed; we send the user to a marketed
 *                  search URL (StubHub, Vivid Seats, TickPick, Gametime).
 *
 * Everything a provider needs to answer a question about a game travels in
 * `GameContext`, so providers never touch the database or Next.js APIs.
 */

import type { TeamColors } from "@/lib/types";

export type ProviderType = "inventory" | "deeplink";

export type ProviderId =
  "seatgeek" | "ticketmaster" | "stubhub" | "vividseats" | "tickpick" | "gametime";

/** Fee policy (§5): when a provider's price excludes fees we estimate 20%. */
export const FEE_ESTIMATE_RATE = 0.2;

/** Minimal team shape a provider needs (subset of the `teams` row). */
export interface TeamRef {
  slug: string;
  abbr: string;
  name: string;
  city: string;
  colors: TeamColors;
  seatgeekSlug: string;
  tmAttractionId: string | null;
}

export interface GameContext {
  id: string;
  /** URL slug — also the Mock-Mode fixture key. */
  slug: string;
  league: "nfl" | "nba";
  startsAt: Date;
  status: "scheduled" | "onsale" | "sold_out" | "cancelled" | "final";
  venueName: string | null;
  venueCity: string | null;
  home: TeamRef;
  away: TeamRef;
  seatgeekEventId: string | null;
  ticketmasterId: string | null;
}

/** A provider-shaped event (used to reconcile provider data back to `games`). */
export interface NormalizedEvent {
  providerId: ProviderId;
  eventId: string;
  title: string;
  startsAt: Date;
  venueName: string | null;
  venueCity: string | null;
  /** Public event URL, pre-affiliate-wrap. */
  url: string;
  isMock: boolean;
}

/**
 * What a fan actually pays (roadmap §3). `minPriceCents` is the base listing
 * price; `feesCents` is 0 for an all-in provider or an estimate otherwise.
 */
export interface NormalizedQuote {
  providerId: ProviderId;
  minPriceCents: number | null;
  feesCents: number | null;
  allInCents: number;
  /** FTC: true when fees were estimated, not returned by the provider. */
  allInIsEstimate: boolean;
  listingCount: number | null;
  /** Outbound URL (affiliate wrapping happens in lib/affiliate/wrap.ts). */
  url: string;
  fetchedAt: Date;
  isMock: boolean;
}

export interface TicketProvider {
  id: ProviderId;
  name: string;
  type: ProviderType;
  /** Whether prices returned by this provider include fees (§3). */
  hasFeesData: boolean;
  /** Public site, used as the deeplink fallback and Mock-Mode target. */
  siteUrl: string;
  /** True when this provider is serving fixture data, not a real API. */
  usesMock(): boolean;
  /** Upcoming events for a team. `[]` for deeplink providers. */
  getGames(team: TeamRef): Promise<NormalizedEvent[]>;
  /** Best all-in quote for a game, or null when none is available. */
  getQuote(game: GameContext): Promise<NormalizedQuote | null>;
  /** Marketing/search URL for deeplink providers (undefined for inventory). */
  deeplinkFor?(game: GameContext): string;
}

/** Human-readable matchup label: "Pittsburgh Steelers at Chicago Bears". */
export function matchupLabel(game: Pick<GameContext, "away" | "home">): string {
  return `${game.away.name} at ${game.home.name}`;
}

export interface QuoteInput {
  providerId: ProviderId;
  minPriceCents: number | null;
  listingCount: number | null;
  url: string;
  fetchedAt: Date;
  isMock: boolean;
  /** True when the upstream price already includes fees (§3). */
  hasFeesData: boolean;
}

/**
 * Apply the §5 fee policy: all-in price = base + fees (0 if the provider returns
 * all-in prices, an estimated 20% otherwise). Returns null when there is no
 * priceable listing.
 */
export function makeQuote(input: QuoteInput): NormalizedQuote | null {
  if (input.minPriceCents === null || input.minPriceCents <= 0) return null;
  const feesCents = input.hasFeesData
    ? 0
    : Math.round(input.minPriceCents * FEE_ESTIMATE_RATE);
  return {
    providerId: input.providerId,
    minPriceCents: input.minPriceCents,
    feesCents,
    allInCents: input.minPriceCents + feesCents,
    allInIsEstimate: !input.hasFeesData,
    listingCount: input.listingCount,
    url: input.url,
    fetchedAt: input.fetchedAt,
    isMock: input.isMock,
  };
}
