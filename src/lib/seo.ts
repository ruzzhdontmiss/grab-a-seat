/**
 * SEO helpers (roadmap §7): canonical URLs, metadata and schema.org JSON-LD.
 */

import type { GameWithRelations, TeamRow } from "@/lib/db/queries";
import { env } from "@/lib/env";
import { matchupLong } from "@/lib/games";

export const SITE_URL = env.BETTER_AUTH_URL;
export const SITE_NAME = "FanTicket Hub";

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export function leagueLabel(league: "nfl" | "nba"): string {
  return league === "nfl" ? "NFL" : "NBA";
}

export function eventTitle(game: GameWithRelations): string {
  return `${matchupLong(game)} tickets — all-in prices`;
}

export interface OfferInput {
  providerName: string;
  priceCents: number;
  url: string;
  isEstimate: boolean;
}

/** schema.org/SportsEvent with an Offer per provider (roadmap §7). */
export function eventJsonLd(game: GameWithRelations, offers: OfferInput[]) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: matchupLong(game),
    startDate: game.startsAt.toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: absoluteUrl(`/game/${game.slug}`),
    sport: game.league === "nfl" ? "American Football" : "Basketball",
    location: game.venue
      ? {
          "@type": "Place",
          name: game.venue.name,
          address: game.venue.city
            ? { "@type": "PostalAddress", addressLocality: game.venue.city }
            : undefined,
        }
      : undefined,
    homeTeam: { "@type": "SportsTeam", name: game.homeTeam.name },
    awayTeam: { "@type": "SportsTeam", name: game.awayTeam.name },
    offers: offers.map((offer) => ({
      "@type": "Offer",
      price: (offer.priceCents / 100).toFixed(2),
      priceCurrency: "USD",
      url: offer.url,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: offer.providerName },
      ...(offer.isEstimate
        ? { description: "Estimated all-in price; fees estimated." }
        : {}),
    })),
  };
}

export function teamJsonLd(team: TeamRow) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: team.name,
    sport: team.league === "nfl" ? "American Football" : "Basketball",
    url: absoluteUrl(`/${team.league}/${team.slug}`),
    memberOf: {
      "@type": "SportsOrganization",
      name:
        team.league === "nfl"
          ? "National Football League"
          : "National Basketball Association",
    },
    address: { "@type": "PostalAddress", addressLocality: team.city },
  };
}

/**
 * JSON-LD is rendered by the `<JsonLd>` component in
 * `src/components/domain/json-ld.tsx` (JSX cannot live in a .ts file).
 */
