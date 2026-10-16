/**
 * GET /api/r/[provider]?game={id} — the single outbound CTA route (roadmap §5).
 *
 * Recomputes the destination server-side (no open-redirect surface), logs an
 * `affiliate_clicks` row, then 302s to the affiliate-wrapped URL.
 */

import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { wrapAffiliateUrl } from "@/lib/affiliate/wrap";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { affiliateClicks } from "@/lib/db/schema";
import { getGameById } from "@/lib/db/queries";
import { toGameContext } from "@/lib/games";
import { getProvider } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  const provider = getProvider(providerId);
  if (!provider) {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }

  const gameId = request.nextUrl.searchParams.get("game");
  if (!gameId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const game = await getGameById(gameId);
  if (!game) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const context = toGameContext(game);

  let destination = provider.siteUrl;
  try {
    if (provider.type === "inventory") {
      const quote = await provider.getQuote(context);
      destination = quote?.url ?? provider.siteUrl;
    } else {
      destination = provider.deeplinkFor?.(context) ?? provider.siteUrl;
    }
  } catch (error) {
    console.error(`[redirect:${providerId}] destination lookup failed`, error);
    destination = provider.siteUrl;
  }

  const url = wrapAffiliateUrl(provider, destination);

  try {
    const session = await auth.api
      .getSession({ headers: await headers() })
      .catch(() => null);
    await db.insert(affiliateClicks).values({
      gameId: game.id,
      providerId: provider.id,
      userId: session?.user?.id ?? null,
    });
  } catch (error) {
    // Click logging must never block the redirect.
    console.error(`[redirect:${providerId}] click log failed`, error);
  }

  return NextResponse.redirect(url, 302);
}
