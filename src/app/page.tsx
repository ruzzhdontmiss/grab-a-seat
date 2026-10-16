import { ArrowUpRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { JsonLd } from "@/components/domain/json-ld";
import { TeamSearch } from "@/components/domain/team-search";
import { TrendArrow } from "@/components/domain/trend-arrow";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { TeamMonogram } from "@/components/ui/monogram";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllTeams, getUpcomingGames } from "@/lib/db/queries";
import { getProvider } from "@/lib/providers";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { formatCents, formatDateShort } from "@/lib/utils";
import { buildViews } from "@/lib/views";

export const revalidate = 300;

const STATS = [
  { label: "Providers", value: "6" },
  { label: "Sync interval", value: "15m" },
  { label: "Pricing", value: "All-in" },
  { label: "Coverage", value: "NFL · NBA" },
];

export default async function HomePage() {
  const [teams, games] = await Promise.all([
    getAllTeams(),
    getUpcomingGames({ limit: 300 }),
  ]);
  const views = await buildViews(games);

  const drops = [...views.values()]
    .filter((view) => view.trend.direction === "down" && view.trend.pct !== null)
    .sort((a, b) => (a.trend.pct as number) - (b.trend.pct as number))
    .slice(0, 8);

  const nflCount = teams.filter((team) => team.league === "nfl").length;
  const nbaCount = teams.filter((team) => team.league === "nba").length;

  return (
    <div className="space-y-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: absoluteUrl("/"),
        }}
      />

      {/* Hero ---------------------------------------------------------------- */}
      <section className="border-line border-b pb-12">
        <p className="label">NFL · NBA · all-in pricing</p>
        <h1 className="mt-4 max-w-3xl text-5xl sm:text-6xl">
          Every seat. Every price.
          <br />
          One board.
        </h1>
        <p className="text-text-dim mt-5 max-w-xl text-[15px] leading-relaxed">
          We watch SeatGeek, Ticketmaster, StubHub and the rest — then show you the
          cheapest all-in price per game. Set a number. We tell you the moment it
          clears.
        </p>
        <div className="mt-7">
          <TeamSearch
            teams={teams.map((team) => ({
              id: team.id,
              slug: team.slug,
              league: team.league,
              name: team.name,
              city: team.city,
              abbr: team.abbr,
              colors: team.colors,
            }))}
          />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/nfl" className={buttonVariants({ size: "lg" })}>
            NFL prices
          </Link>
          <Link
            href="/nba"
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            NBA prices
          </Link>
        </div>
      </section>

      {/* Stat strip ---------------------------------------------------------- */}
      <section>
        <dl className="border-line grid grid-cols-2 border md:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="border-line border-r border-b px-5 py-5 last:border-r-0 md:border-b-0"
            >
              <dt className="label">{stat.label}</dt>
              <dd className="mt-2 font-mono text-2xl tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* League split -------------------------------------------------------- */}
      <section className="grid gap-4 sm:grid-cols-2">
        {[
          { league: "nfl" as const, count: nflCount, blurb: "32 teams · weekly slate" },
          {
            league: "nba" as const,
            count: nbaCount,
            blurb: "30 teams · nightly slate",
          },
        ].map((option) => (
          <Link
            key={option.league}
            href={`/${option.league}`}
            className="border-line bg-surface hover:border-volt/60 group rounded-md border p-6 transition-colors duration-150"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="label">{option.league}</p>
                <h2 className="mt-3 text-3xl">{option.league.toUpperCase()}</h2>
                <p className="text-text-dim mt-2 text-[13px]">{option.blurb}</p>
              </div>
              <span className="text-text-dim group-hover:text-volt font-mono text-[12px] tabular-nums">
                {option.count} teams
              </span>
            </div>
            <span className="text-volt mt-6 inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.12em] uppercase">
              View prices
              <ArrowUpRight size={13} />
            </span>
          </Link>
        ))}
      </section>

      {/* Biggest drops ------------------------------------------------------- */}
      <section>
        <div className="border-line mb-4 flex flex-wrap items-end justify-between gap-3 border-b pb-3">
          <h2 className="text-2xl">Biggest drops right now</h2>
          <span className="label">vs previous sync · all-in</span>
        </div>

        {drops.length === 0 ? (
          <div className="border-line bg-surface rounded-md border p-6">
            <p className="text-text text-[14px]">No price moves yet — tracking now.</p>
            <p className="text-text-dim mt-2 text-[13px]">
              Run the sync job to take the first snapshots:{" "}
              <code className="font-mono">
                curl -X POST /api/cron/sync -H &quot;Authorization: Bearer
                $CRON_SECRET&quot;
              </code>
            </p>
          </div>
        ) : (
          <div className="border-line bg-surface overflow-x-auto border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Game</TableHead>
                  <TableHead className="hidden sm:table-cell">Venue</TableHead>
                  <TableHead numeric>All-in</TableHead>
                  <TableHead numeric>Change</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Deal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drops.map((view) => {
                  const provider = view.bestProviderId
                    ? getProvider(view.bestProviderId)
                    : null;
                  return (
                    <TableRow key={view.game.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <TeamMonogram
                            abbr={view.game.awayTeam.abbr}
                            colors={view.game.awayTeam.colors}
                          />
                          <span className="text-text-dim font-mono text-[12px]">@</span>
                          <TeamMonogram
                            abbr={view.game.homeTeam.abbr}
                            colors={view.game.homeTeam.colors}
                          />
                          <Link
                            href={`/game/${view.game.slug}`}
                            className="font-display hover:text-volt ml-1 text-[15px] tracking-tight transition-colors duration-150"
                          >
                            {view.game.awayTeam.abbr}–{view.game.homeTeam.abbr}
                          </Link>
                          <span className="text-text-dim hidden font-mono text-[11px] sm:inline">
                            {formatDateShort(view.game.startsAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-text-dim hidden sm:table-cell">
                        {view.game.venue?.name ?? "—"}
                      </TableCell>
                      <TableCell numeric>
                        {formatCents(view.bestAllIn)}
                        {view.bestIsEstimate ? (
                          <span className="text-text-dim ml-1">est.</span>
                        ) : null}
                      </TableCell>
                      <TableCell numeric>
                        <TrendArrow trend={view.trend} />
                      </TableCell>
                      <TableCell>
                        {provider ? (
                          <Badge variant="neutral">{provider.name}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/game/${view.game.slug}`}
                          className={buttonVariants({
                            variant: "secondary",
                            size: "sm",
                          })}
                        >
                          Compare
                          <ArrowUpRight size={13} />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-text-dim mt-3 flex items-center gap-2 text-[12px]">
          <ShieldCheck size={14} className="text-volt" />
          Estimates marked <span className="text-text">“est.”</span> — all-in totals,
          fees included where known, per FTC junk-fee guidance.
        </p>
      </section>
    </div>
  );
}
