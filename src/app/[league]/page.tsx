import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FollowButton } from "@/components/domain/follow-button";
import { JsonLd } from "@/components/domain/json-ld";
import { TrendArrow } from "@/components/domain/trend-arrow";
import { Badge } from "@/components/ui/badge";
import { TeamMonogram } from "@/components/ui/monogram";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTeamsByLeague, getUpcomingGames } from "@/lib/db/queries";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { formatDateShort, formatCents } from "@/lib/utils";
import { buildViews } from "@/lib/views";

const LEAGUES = ["nfl", "nba"] as const;
type League = (typeof LEAGUES)[number];

function isLeague(value: string): value is League {
  return (LEAGUES as readonly string[]).includes(value);
}

export const dynamicParams = false;
export const revalidate = 300; // ISR; the sync cron revalidates after each run.

export function generateStaticParams() {
  return LEAGUES.map((league) => ({ league }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ league: string }>;
}): Promise<Metadata> {
  const { league } = await params;
  if (!isLeague(league)) return {};
  const label = league.toUpperCase();
  const title = `${label} ticket prices — cheapest all-in per game`;
  const description = `Live all-in ticket prices for every ${label} game on the schedule, compared across SeatGeek, Ticketmaster, StubHub and more.`;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/${league}`) },
    openGraph: {
      title: `${title} · ${SITE_NAME}`,
      description,
      url: absoluteUrl(`/${league}`),
      siteName: SITE_NAME,
    },
  };
}

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ league: string }>;
}) {
  const { league } = await params;
  if (!isLeague(league)) notFound();

  const [teams, games] = await Promise.all([
    getTeamsByLeague(league),
    getUpcomingGames({ league, limit: 300 }),
  ]);
  const views = await buildViews(games);

  // Next game per team (games are ordered by kickoff ascending).
  const nextGameByTeam = new Map<string, string>();
  for (const game of games) {
    if (!nextGameByTeam.has(game.homeTeamId))
      nextGameByTeam.set(game.homeTeamId, game.id);
    if (!nextGameByTeam.has(game.awayTeamId))
      nextGameByTeam.set(game.awayTeamId, game.id);
  }

  const label = league.toUpperCase();

  return (
    <div className="space-y-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `${label} teams`,
          itemListElement: teams.map((team, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(`/${league}/${team.slug}`),
            name: team.name,
          })),
        }}
      />

      <header className="border-line border-b pb-6">
        <p className="label">League · all-in pricing</p>
        <h1 className="mt-3 text-4xl">{label} ticket prices</h1>
        <p className="text-text-dim mt-3 max-w-2xl text-[15px]">
          Cheapest all-in price for each team&apos;s next game, refreshed every 15
          minutes. Estimates are marked <span className="text-text">est.</span>
        </p>
      </header>

      <nav className="flex items-center gap-2">
        {LEAGUES.map((option) => (
          <Link
            key={option}
            href={`/${option}`}
            className={
              option === league
                ? "border-volt bg-volt/10 text-volt rounded-sm border px-3 py-1 font-mono text-[11px] tracking-[0.12em] uppercase"
                : "border-line text-text-dim hover:text-text rounded-sm border px-3 py-1 font-mono text-[11px] tracking-[0.12em] uppercase"
            }
          >
            {option}
          </Link>
        ))}
      </nav>

      <div className="border-line bg-surface overflow-x-auto border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Team</TableHead>
              <TableHead className="hidden sm:table-cell">Next game</TableHead>
              <TableHead numeric>Cheapest all-in</TableHead>
              <TableHead numeric className="hidden sm:table-cell">
                Trend
              </TableHead>
              <TableHead className="text-right">Follow</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => {
              const gameId = nextGameByTeam.get(team.id);
              const view = gameId ? views.get(gameId) : undefined;
              const opponent = view
                ? view.game.homeTeamId === team.id
                  ? view.game.awayTeam
                  : view.game.homeTeam
                : null;

              return (
                <TableRow key={team.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <TeamMonogram abbr={team.abbr} colors={team.colors} />
                      <Link
                        href={`/${league}/${team.slug}`}
                        className="hover:text-volt text-[13px] font-medium transition-colors duration-150"
                      >
                        {team.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="text-text-dim hidden sm:table-cell">
                    {view && opponent ? (
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[12px]">
                          {view.game.homeTeamId === team.id ? "vs" : "@"}
                        </span>
                        <span
                          className="font-display text-[13px]"
                          style={{ color: opponent.colors.primary }}
                        >
                          {opponent.abbr}
                        </span>
                        <span className="text-[12px]">
                          {formatDateShort(view.game.startsAt)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-text-dim">No games scheduled</span>
                    )}
                  </TableCell>
                  <TableCell numeric>
                    {view?.bestAllIn != null ? (
                      <>
                        {formatCents(view.bestAllIn)}
                        {view.bestIsEstimate ? (
                          <span className="text-text-dim ml-1">est.</span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-text-dim">—</span>
                    )}
                  </TableCell>
                  <TableCell numeric className="hidden sm:table-cell">
                    {view ? <TrendArrow trend={view.trend} /> : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {view ? (
                        <Link
                          href={`/game/${view.game.slug}`}
                          className="text-text-dim hover:text-volt hidden font-mono text-[11px] tracking-[0.1em] uppercase transition-colors duration-150 md:inline"
                        >
                          Game
                        </Link>
                      ) : null}
                      <FollowButton
                        teamId={team.id}
                        nextPath={`/${league}/${team.slug}`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {teams.length === 0 ? (
        <p className="text-text-dim text-[13px]">
          No teams found. Run <code className="font-mono">pnpm db:seed</code>.
        </p>
      ) : (
        <p className="text-text-dim text-[12px]">
          {teams.length} teams
          {games.length === 0
            ? " · no upcoming games in the next 30 days yet"
            : ` · ${games.length} upcoming games tracked`}
        </p>
      )}

      <p className="text-text-dim flex items-center gap-2 text-[12px]">
        <Badge variant="outline">est.</Badge>
        marks prices whose fees we estimate. Final price is set by the provider at
        checkout.
      </p>
    </div>
  );
}
