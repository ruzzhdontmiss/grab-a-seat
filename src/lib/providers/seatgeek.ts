/**
 * SeatGeek Platform API provider (roadmap §5).
 *
 *   GET https://api.seatgeek.com/2/events?performers.slug={slug}&datetime_utc.gte=now
 *
 * Docs: https://seatgeek.github.io/  (events endpoint + response document).
 * SeatGeek does not document whether `stats.lowest_price` includes fees, so
 * `hasFeesData` is false and the §5 20% estimate applies.
 */

import { cachedJson } from "@/lib/cache";
import { env } from "@/lib/env";

import {
  makeQuote,
  type GameContext,
  type NormalizedEvent,
  type NormalizedQuote,
  type TeamRef,
  type TicketProvider,
} from "./base";
import { mockQuoteFor } from "./mock";
import {
  dollarsToCents,
  seatGeekEventSchema,
  seatGeekEventsResponseSchema,
  toSeatGeekEvent,
  type SeatGeekEvent,
} from "./normalize";

const API_BASE = "https://api.seatgeek.com/2";
const CACHE_TTL_SECONDS = 600; // §2: 5–15 min.

function usesMock(): boolean {
  return !env.SEATGEEK_CLIENT_ID || env.MOCK_PROVIDERS.includes("seatgeek");
}

function withClientId(query: URLSearchParams, clientId: string): URLSearchParams {
  query.set("client_id", clientId);
  return query;
}

async function fetchEventPage(
  query: URLSearchParams,
  clientId: string,
): Promise<SeatGeekEvent[]> {
  const params = withClientId(query, clientId);
  params.set("per_page", "50");
  const url = `${API_BASE}/events?${params.toString()}`;
  const json = await cachedJson<unknown>(
    `seatgeek:events:${params.toString()}`,
    url,
    CACHE_TTL_SECONDS,
  );
  return seatGeekEventsResponseSchema.parse(json).events;
}

/** SeatGeek has no per-id endpoint cache key benefit beyond the events list. */
async function fetchEventById(
  eventId: string,
  clientId: string,
): Promise<SeatGeekEvent | null> {
  const params = withClientId(new URLSearchParams(), clientId);
  const url = `${API_BASE}/events/${eventId}?${params.toString()}`;
  const json = await cachedJson<unknown>(
    `seatgeek:event:${eventId}`,
    url,
    CACHE_TTL_SECONDS,
  );
  const parsed = seatGeekEventSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

function quoteFromEvent(event: SeatGeekEvent, fetchedAt: Date): NormalizedQuote | null {
  return makeQuote({
    providerId: "seatgeek",
    minPriceCents: dollarsToCents(event.stats?.lowest_price),
    listingCount:
      typeof event.stats?.listing_count === "number" ? event.stats.listing_count : null,
    url: event.url ?? "https://seatgeek.com",
    fetchedAt,
    isMock: false,
    hasFeesData: false,
  });
}

/** Pick the event whose UTC day matches the game's start day, else the nearest. */
function pickEventForGame(
  events: SeatGeekEvent[],
  game: GameContext,
): SeatGeekEvent | null {
  if (events.length === 0) return null;
  const targetDay = game.startsAt.toISOString().slice(0, 10);
  const sameDay = events.find(
    (event) => (event.datetime_utc ?? "").slice(0, 10) === targetDay,
  );
  if (sameDay) return sameDay;
  return [...events].sort(
    (a, b) =>
      Math.abs(new Date(a.datetime_utc ?? 0).getTime() - game.startsAt.getTime()) -
      Math.abs(new Date(b.datetime_utc ?? 0).getTime() - game.startsAt.getTime()),
  )[0];
}

export function createSeatGeekProvider(): TicketProvider {
  return {
    id: "seatgeek",
    name: "SeatGeek",
    type: "inventory",
    hasFeesData: false,
    siteUrl: "https://seatgeek.com",
    usesMock,

    async getGames(team: TeamRef): Promise<NormalizedEvent[]> {
      if (usesMock()) return [];
      const clientId = env.SEATGEEK_CLIENT_ID;
      if (!clientId) return [];
      const query = new URLSearchParams({
        "performers.slug": team.seatgeekSlug,
        "datetime_utc.gte": new Date().toISOString().slice(0, 19),
      });
      const events = await fetchEventPage(query, clientId);
      return events
        .filter((event) => !Number.isNaN(Date.parse(event.datetime_utc ?? "")))
        .map(toSeatGeekEvent);
    },

    async getQuote(game: GameContext): Promise<NormalizedQuote | null> {
      if (usesMock()) return mockQuoteFor("seatgeek", game.slug);

      const clientId = env.SEATGEEK_CLIENT_ID;
      if (!clientId) return null;

      const fetchedAt = new Date();

      if (game.seatgeekEventId) {
        const event = await fetchEventById(game.seatgeekEventId, clientId);
        if (event) return quoteFromEvent(event, fetchedAt);
      }

      const cursor = new Date(game.startsAt);
      const query = new URLSearchParams({
        "performers.slug": game.home.seatgeekSlug,
        "datetime_utc.gte": new Date(cursor.getTime() - 36 * 3_600_000)
          .toISOString()
          .slice(0, 19),
        "datetime_utc.lte": new Date(cursor.getTime() + 36 * 3_600_000)
          .toISOString()
          .slice(0, 19),
      });
      const events = await fetchEventPage(query, clientId);
      const event = pickEventForGame(events, game);
      return event ? quoteFromEvent(event, fetchedAt) : null;
    },
  };
}
