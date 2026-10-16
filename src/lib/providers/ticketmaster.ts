/**
 * Ticketmaster Discovery provider (roadmap §5).
 *
 *   GET https://app.ticketmaster.com/discovery/v2/events.json?attractionId=…
 *   GET https://app.ticketmaster.com/discovery/v2/events/{id}.json
 *
 * Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 * `priceRanges` excludes fees, so the §5 20% estimate applies (`hasFeesData:false`).
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
  parseTicketmasterEvent,
  ticketmasterBasePrice,
  ticketmasterEventsResponseSchema,
  toTicketmasterEvent,
  type TicketmasterEvent,
} from "./normalize";

const API_BASE = "https://app.ticketmaster.com/discovery/v2";
const CACHE_TTL_SECONDS = 600;

function usesMock(): boolean {
  return !env.TICKETMASTER_API_KEY || env.MOCK_PROVIDERS.includes("ticketmaster");
}

/** Ticketmaster returns prices in major units already; convert to cents. */
function dollars(value: number | null): number | null {
  return dollarsToCents(value);
}

async function fetchEvents(
  query: URLSearchParams,
  apiKey: string,
): Promise<TicketmasterEvent[]> {
  query.set("apikey", apiKey);
  query.set("size", "50");
  const url = `${API_BASE}/events.json?${query.toString()}`;
  const json = await cachedJson<unknown>(
    `ticketmaster:events:${query.toString()}`,
    url,
    CACHE_TTL_SECONDS,
  );
  return ticketmasterEventsResponseSchema.parse(json)._embedded?.events ?? [];
}

async function fetchEventById(
  eventId: string,
  apiKey: string,
): Promise<TicketmasterEvent | null> {
  const url = `${API_BASE}/events/${eventId}.json?apikey=${encodeURIComponent(apiKey)}`;
  const json = await cachedJson<unknown>(
    `ticketmaster:event:${eventId}`,
    url,
    CACHE_TTL_SECONDS,
  );
  return parseTicketmasterEvent(json);
}

function quoteFromEvent(
  event: TicketmasterEvent,
  fetchedAt: Date,
): NormalizedQuote | null {
  return makeQuote({
    providerId: "ticketmaster",
    minPriceCents: dollars(ticketmasterBasePrice(event).min),
    listingCount: null,
    url: event.url ?? "https://www.ticketmaster.com",
    fetchedAt,
    isMock: false,
    hasFeesData: false,
  });
}

function pickEventForGame(
  events: TicketmasterEvent[],
  game: GameContext,
): TicketmasterEvent | null {
  if (events.length === 0) return null;
  const targetDay = game.startsAt.toISOString().slice(0, 10);
  const dayOf = (event: TicketmasterEvent) =>
    (event.dates?.start?.dateTime ?? event.dates?.start?.localDate ?? "").slice(0, 10);
  const sameDay = events.find((event) => dayOf(event) === targetDay);
  if (sameDay) return sameDay;
  return [...events].sort(
    (a, b) =>
      Math.abs(new Date(dayOf(a) || 0).getTime() - game.startsAt.getTime()) -
      Math.abs(new Date(dayOf(b) || 0).getTime() - game.startsAt.getTime()),
  )[0];
}

export function createTicketmasterProvider(): TicketProvider {
  return {
    id: "ticketmaster",
    name: "Ticketmaster",
    type: "inventory",
    hasFeesData: false,
    siteUrl: "https://www.ticketmaster.com",
    usesMock,

    async getGames(team: TeamRef): Promise<NormalizedEvent[]> {
      if (usesMock() || !env.TICKETMASTER_API_KEY || !team.tmAttractionId) return [];
      const query = new URLSearchParams({
        attractionId: team.tmAttractionId,
        startDateTime: new Date().toISOString().slice(0, 19) + "Z",
        sort: "date,asc",
      });
      const events = await fetchEvents(query, env.TICKETMASTER_API_KEY);
      return events.map(toTicketmasterEvent);
    },

    async getQuote(game: GameContext): Promise<NormalizedQuote | null> {
      if (usesMock()) return mockQuoteFor("ticketmaster", game.slug);

      const apiKey = env.TICKETMASTER_API_KEY;
      if (!apiKey) return null;

      const fetchedAt = new Date();

      if (game.ticketmasterId) {
        const event = await fetchEventById(game.ticketmasterId, apiKey);
        if (event) {
          const quote = quoteFromEvent(event, fetchedAt);
          if (quote) return quote;
        }
      }

      // tmAttractionId is populated by the seed from Ticketmaster; until then we
      // cannot search reliably, so there is simply no quote (never a guess).
      const attractionId = game.home.tmAttractionId;
      if (!attractionId) return null;

      const cursor = game.startsAt.getTime();
      const query = new URLSearchParams({
        attractionId,
        startDateTime:
          new Date(cursor - 36 * 3_600_000).toISOString().slice(0, 19) + "Z",
        endDateTime: new Date(cursor + 36 * 3_600_000).toISOString().slice(0, 19) + "Z",
      });
      const events = await fetchEvents(query, apiKey);
      const event = pickEventForGame(events, game);
      return event ? quoteFromEvent(event, fetchedAt) : null;
    },
  };
}
