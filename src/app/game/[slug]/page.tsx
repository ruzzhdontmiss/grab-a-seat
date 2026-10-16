import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { AlertBox } from "@/components/domain/alert-box";
import { JsonLd } from "@/components/domain/json-ld";
import { PriceTable, type PriceRow } from "@/components/domain/price-table";
import { TrendArrow } from "@/components/domain/trend-arrow";
import { Badge } from "@/components/ui/badge";
import { TeamMonogram } from "@/components/ui/monogram";
import { ctaHref } from "@/lib/affiliate/wrap";
import { getGameBySlug } from "@/lib/db/queries";
import { isLowestEver, latestPerProvider, matchupLong } from "@/lib/games";
import { comparisonProviders } from "@/lib/providers";
import { absoluteUrl, eventJsonLd, eventTitle, SITE_NAME } from "@/lib/seo";
import { formatCents, formatKickoff } from "@/lib/utils";
import { buildView } from "@/lib/views";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) return {};

  const title = eventTitle(game);
  const description = `All-in ticket prices for ${matchupLong(game)} at ${
    game.venue?.name ?? "the venue"
  }, compared across SeatGeek, Ticketmaster and more.`;
  const url = absoluteUrl(`/game/${game.slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} · ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
  };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();

  const view = await buildView(game);
  const latest = latestPerProvider(view.rows);

  const rows: PriceRow[] = comparisonProviders().map((provider) => {
    const snapshot = latest.get(provider.id);
    const allIn = snapshot?.allInMinCents ?? null;
    const min = snapshot?.minCents ?? null;
    return {
      providerId: provider.id,
      name: provider.name,
      type: provider.type,
      allInCents: allIn,
      minCents: min,
      feesCents: allIn !== null && min !== null ? allIn - min : null,
      listingCount: snapshot?.listingCount ?? null,
      isEstimate: !provider.hasFeesData,
      href: ctaHref(provider.id, game.id),
      isBest: false,
      isMock: provider.usesMock(),
    };
  });

  // Sort: priced inventory first (cheapest first), then unpriced inventory, then deeplinks.
  const rank = (row: PriceRow) => {
    if (row.type === "inventory" && row.allInCents !== null) return 0;
    if (row.type === "inventory") return 1;
    return 2;
  };
  rows.sort(
    (a, b) =>
      rank(a) - rank(b) || (a.allInCents ?? Infinity) - (b.allInCents ?? Infinity),
  );

  const bestPrice = rows.find((row) => row.allInCents !== null)?.allInCents ?? null;
  if (bestPrice !== null) {
    const bestRow = rows.find((row) => row.allInCents === bestPrice);
    if (bestRow) bestRow.isBest = true;
  }

  const offers = rows
    .filter((row) => row.allInCents !== null)
    .map((row) => ({
      providerName: row.name,
      priceCents: row.allInCents as number,
      url: absoluteUrl(row.href),
      isEstimate: row.isEstimate,
    }));

  const lowestEverNow = isLowestEver(view.rows);

  return (
    <div className="space-y-8">
      <JsonLd data={eventJsonLd(game, offers)} />

      <nav className="text-text-dim font-mono text-[11px] tracking-[0.1em] uppercase">
        <Link href={`/${game.league}`} className="hover:text-volt">
          {game.league}
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/${game.league}/${game.homeTeam.slug}`}
          className="hover:text-volt"
        >
          {game.homeTeam.abbr}
        </Link>
      </nav>

      <header className="border-line border-b pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">{game.league.toUpperCase()}</Badge>
          <span className="label">{formatKickoff(game.startsAt)}</span>
          {game.venue ? (
            <span className="text-text-dim text-[12px]">
              {game.venue.name}
              {game.venue.city ? ` · ${game.venue.city}` : ""}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <TeamMonogram
            abbr={game.awayTeam.abbr}
            colors={game.awayTeam.colors}
            className="h-7 min-w-[34px] text-[12px]"
          />
          <h1 className="text-4xl">{matchupLong(game)}</h1>
          <TeamMonogram
            abbr={game.homeTeam.abbr}
            colors={game.homeTeam.colors}
            className="h-7 min-w-[34px] text-[12px]"
          />
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-6">
          <div>
            <p className="label">Cheapest all-in</p>
            <p className="mt-2 font-mono text-4xl tabular-nums">
              {formatCents(view.bestAllIn)}
              {view.bestIsEstimate && view.bestAllIn !== null ? (
                <span className="text-text-dim ml-2 text-[14px]">est.</span>
              ) : null}
            </p>
          </div>
          <div className="space-y-1">
            <p className="label">Movement</p>
            <p className="flex items-center gap-3">
              <TrendArrow trend={view.trend} suffix="vs last sync" />
              <TrendArrow trend={view.trend7d} suffix="vs 7d" />
            </p>
          </div>
          {lowestEverNow ? (
            <Badge variant="volt">
              {view.rows.length > 1 ? "Lowest we've seen" : "Tracking now"}
            </Badge>
          ) : null}
          <div className="ml-auto text-right">
            <p className="label">Listings</p>
            <p className="mt-2 font-mono text-[16px] tabular-nums">
              {view.listings > 0 ? view.listings.toLocaleString("en-US") : "—"}
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="border-line flex flex-wrap items-end justify-between gap-3 border-b pb-3">
            <h2 className="text-2xl">Compare providers</h2>
            <span className="label">sorted by all-in price</span>
          </div>

          <PriceTable rows={rows} />

          <p className="text-text-dim flex items-start gap-2 text-[12px] leading-relaxed">
            <ShieldCheck size={14} className="text-volt mt-0.5 shrink-0" />
            <span>
              All-in totals include fees where a provider reports them. Where a provider
              does not publish fees we estimate 20% and mark the total{" "}
              <span className="text-text">est.</span> — the final price is always set by
              the provider at checkout. We may earn a commission on purchases made
              through our links, at no extra cost to you.
            </span>
          </p>

          {view.rows.length <= 1 ? (
            <div className="border-line bg-surface rounded-md border p-4">
              <p className="label">Price history</p>
              <p className="text-text-dim mt-2 text-[13px]">
                No price history yet — tracking now. Charts land in Phase 2.
              </p>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <AlertBox gameId={game.id} nextPath={`/game/${game.slug}`} />

          <div className="border-line bg-surface rounded-md border p-4">
            <p className="label">How this works</p>
            <ul className="text-text-dim mt-3 space-y-2 text-[12px] leading-relaxed">
              <li>
                Prices are snapshots taken every 15 minutes, so they can lag a live
                listing by a few minutes.
              </li>
              <li>
                &quot;est.&quot; marks a total whose fees we estimate rather than
                receive from the provider.
              </li>
              <li>
                We are not a ticket seller. Every purchase happens on the provider.
              </li>
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );
}
