/**
 * External-response normalization (roadmap §3, §8).
 *
 * Every provider payload is parsed with Zod before it is trusted. Schemas use
 * `.passthrough()` and mostly-optional fields: upstream APIs add fields freely,
 * and we would rather degrade a single field to null than blank the site.
 *
 * Field names verified against the official docs:
 *   - SeatGeek Platform API   https://seatgeek.github.io/  (events + stats)
 *   - Ticketmaster Discovery  https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */

import { z } from "zod";

import type { NormalizedEvent } from "./base";

/* ── SeatGeek ────────────────────────────────────────────────────────────── */

export const seatGeekPerformerSchema = z
  .object({
    id: z.number().optional(),
    slug: z.string().optional(),
    name: z.string().optional(),
    primary: z.boolean().optional(),
    home_team: z.boolean().optional(),
    away_team: z.boolean().optional(),
  })
  .passthrough();

export const seatGeekVenueSchema = z
  .object({
    id: z.number().optional(),
    name: z.string().optional(),
    city: z.string().optional(),
  })
  .passthrough();

/**
 * `stats` describes currently available listings. SeatGeek's docs document
 * `lowest_price` but do not state whether fees are included, so we treat fees
 * as unknown and estimate (§5 fee policy).
 */
export const seatGeekStatsSchema = z
  .object({
    listing_count: z.number().nullish(),
    lowest_price: z.number().nullish(),
    average_price: z.number().nullish(),
    highest_price: z.number().nullish(),
    median_price: z.number().nullish(),
  })
  .passthrough();

export const seatGeekEventSchema = z
  .object({
    id: z.number(),
    title: z.string().optional(),
    url: z.string().optional(),
    datetime_utc: z.string().optional(),
    datetime_local: z.string().optional(),
    time_tbd: z.boolean().optional(),
    date_tbd: z.boolean().optional(),
    stats: seatGeekStatsSchema.optional(),
    performers: z.array(seatGeekPerformerSchema).optional(),
    venue: seatGeekVenueSchema.nullish(),
  })
  .passthrough();

export const seatGeekEventsResponseSchema = z
  .object({ events: z.array(seatGeekEventSchema) })
  .passthrough();

export type SeatGeekEvent = z.infer<typeof seatGeekEventSchema>;

/** Dollars (number) -> integer cents, or null when absent/non-positive. */
export function dollarsToCents(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

function parseSeatGeekDate(event: SeatGeekEvent): Date {
  const raw = event.datetime_utc ?? event.datetime_local;
  return raw ? new Date(raw.endsWith("Z") ? raw : `${raw}Z`) : new Date(NaN);
}

export function toSeatGeekEvent(event: SeatGeekEvent): NormalizedEvent {
  return {
    providerId: "seatgeek",
    eventId: String(event.id),
    title: event.title ?? "TBD",
    startsAt: parseSeatGeekDate(event),
    venueName: event.venue?.name ?? null,
    venueCity: event.venue?.city ?? null,
    url: event.url ?? "https://seatgeek.com",
    isMock: false,
  };
}

/* ── Ticketmaster Discovery ──────────────────────────────────────────────── */

export const ticketmasterPriceRangeSchema = z
  .object({
    type: z.string().optional(),
    currency: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .passthrough();

export const ticketmasterEventSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    url: z.string().optional(),
    dates: z
      .object({
        start: z
          .object({
            dateTime: z.string().optional(),
            localDate: z.string().optional(),
          })
          .passthrough()
          .optional(),
        status: z.object({ code: z.string().optional() }).passthrough().optional(),
      })
      .passthrough()
      .optional(),
    priceRanges: z.array(ticketmasterPriceRangeSchema).optional(),
    _embedded: z
      .object({
        venues: z
          .array(
            z
              .object({
                name: z.string().optional(),
                city: z
                  .object({ name: z.string().optional() })
                  .passthrough()
                  .optional(),
              })
              .passthrough(),
          )
          .optional(),
        attractions: z
          .array(
            z
              .object({ id: z.string().optional(), name: z.string().optional() })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type TicketmasterEvent = z.infer<typeof ticketmasterEventSchema>;

export const ticketmasterEventsResponseSchema = z
  .object({
    _embedded: z
      .object({ events: z.array(ticketmasterEventSchema).optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

/** Single-event envelope: `Discovery` returns the event object directly. */
export function parseTicketmasterEvent(payload: unknown): TicketmasterEvent | null {
  const parsed = ticketmasterEventSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

function parseTicketmasterDate(event: TicketmasterEvent): Date {
  const start = event.dates?.start;
  const raw = start?.dateTime ?? start?.localDate;
  return raw ? new Date(raw) : new Date(NaN);
}

export function toTicketmasterEvent(event: TicketmasterEvent): NormalizedEvent {
  const venue = event._embedded?.venues?.[0];
  return {
    providerId: "ticketmaster",
    eventId: event.id,
    title: event.name ?? "TBD",
    startsAt: parseTicketmasterDate(event),
    venueName: venue?.name ?? null,
    venueCity: venue?.city?.name ?? null,
    url: event.url ?? "https://www.ticketmaster.com",
    isMock: false,
  };
}

/**
 * `priceRanges` excludes fees. Prefer the `standard` range, else the first
 * priced range. Returns base dollars (min) or null.
 */
export function ticketmasterBasePrice(event: TicketmasterEvent): {
  min: number | null;
  max: number | null;
} {
  const ranges = event.priceRanges ?? [];
  const standard = ranges.find((range) => range.type === "standard") ?? ranges[0];
  return {
    min: typeof standard?.min === "number" ? standard.min : null,
    max: typeof standard?.max === "number" ? standard.max : null,
  };
}
