/**
 * Affiliate wrapping (roadmap §5).
 *
 * Every outbound CTA in the UI points at `/api/r/{provider}?game={id}` — an
 * internal route that recomputes the destination server-side (so there is no
 * open-redirect surface), logs an `affiliate_clicks` row, then 302s here.
 *
 * Tracking IDs come from env only — nothing is hardcoded. Until a partner
 * approves us the env var is empty and the raw destination is returned.
 */

import { env, type Env } from "@/lib/env";
import type { ProviderId, TicketProvider } from "@/lib/providers/base";
import { isMockUrl } from "@/lib/providers/mock";

type AffiliateEnvKey =
  | "SEATGEEK_AFFILIATE_ID"
  | "TICKETMASTER_AFFILIATE_ID"
  | "STUBHUB_AFFILIATE_ID"
  | "VIVIDSEATS_AFFILIATE_ID"
  | "TICKPICK_AFFILIATE_ID"
  | "GAMETIME_AFFILIATE_ID";

/**
 * Tracking parameter names per partner network. Verify these against the
 * approved affiliate link format when each program is approved — they live here
 * (one place) precisely so that is a trivial change.
 */
const AFFILIATE_PARAMS: Record<ProviderId, { envKey: AffiliateEnvKey; param: string }> =
  {
    seatgeek: { envKey: "SEATGEEK_AFFILIATE_ID", param: "aid" },
    ticketmaster: { envKey: "TICKETMASTER_AFFILIATE_ID", param: "cid" },
    stubhub: { envKey: "STUBHUB_AFFILIATE_ID", param: "affiliate_id" },
    vividseats: { envKey: "VIVIDSEATS_AFFILIATE_ID", param: "affiliate_id" },
    tickpick: { envKey: "TICKPICK_AFFILIATE_ID", param: "affiliate_id" },
    gametime: { envKey: "GAMETIME_AFFILIATE_ID", param: "affiliate_id" },
  };

export function affiliateId(providerId: ProviderId): string | undefined {
  return (env as Env)[AFFILIATE_PARAMS[providerId].envKey] ?? undefined;
}

/**
 * Append the affiliate tracking parameter to a destination URL.
 *
 * Mock-Mode destinations (`mock.fantickethub.local`) are never sent to a real
 * user — they collapse to the provider's public site instead (§8: never present
 * mock data as real).
 */
export function wrapAffiliateUrl(
  provider: Pick<TicketProvider, "id" | "siteUrl">,
  destination: string,
): string {
  if (isMockUrl(destination)) return provider.siteUrl;

  const id = affiliateId(provider.id);
  if (!id) return destination;

  try {
    const url = new URL(destination);
    url.searchParams.set(AFFILIATE_PARAMS[provider.id].param, id);
    return url.toString();
  } catch {
    return destination;
  }
}

/** Internal redirect target used for every CTA in the UI. */
export function ctaHref(providerId: string, gameId: string): string {
  const params = new URLSearchParams({ game: gameId });
  return `/api/r/${providerId}?${params.toString()}`;
}

/** Provider-site link (used for the "no price" deeplink rows). */
export function providerSiteHref(providerId: string, gameId: string): string {
  return ctaHref(providerId, gameId);
}
