import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Bell } from "lucide-react";

import { FollowButton } from "@/components/domain/follow-button";
import { JsonLd } from "@/components/domain/json-ld";
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
import { getTeamBySlug, getTeamSchedule } from "@/lib/db/queries";
import { buildViews } from "@/lib/views";
import { getProvider } from "@/lib/providers";
import { absoluteUrl, SITE_NAME, teamJsonLd } from "@/lib/seo";
import { formatCents, formatKickoff } from "@/lib/utils";

export const revalidate = 300;

function isLeague(value: string): value is "nfl" | "nba" {
  return value === "nfl" || value === "nba";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ league: string; team: string }>;
}): Promise<Metadata> {
  const { league, team: teamSlug } = await params;
  if (!isLeague(league)) return {};
  const team = await getTeamBySlug(teamSlug);
  if (!team || team.league !== league) return {};

  const title = `${team.name} tickets — schedule & all-in prices`;
  const description = `Cheapest all-in ticket prices for every ${team.name} game, compared across providers. Set a price alert and we email you when it drops.`;
  const url = absoluteUrl(`/${league}/${team.slug}`);

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

export default async function TeamPage({
  params,
}: {
  params: Promise<{ league: string; team: string }>;
}) {
  const { league, team: teamSlug } = await params;
  if (!isLeague(league)) notFound();

  const team = await getTeamBySlug(teamSlug);
  if (!team || team.league !== league) notFound();

  const schedule = await getTeamSchedule(team.id);
  const views = await buildViews(schedule);

  const nextGame = schedule[0] ? views.get(schedule[0].id) : undefined;
  const tracked = [...views.values()].filter((view) => view.bestAllIn !== null);
  const lowest = tracked.reduce<number | null>(
    (min, view) =>
      view.bestAllIn !== null && (min === null || view.bestAllIn < min)
        ? view.bestAllIn
        : min,
    null,
  );

  return (
    <div className="space-y-8">
      <JsonLd data={teamJsonLd(team)} />

      {/* Hero — team colour is a 2px top border only (§4). */}
      <header
        className="border-line bg-surface rounded-md border border-t-2 p-6"
        style={{ borderTopColor: team.colors.primary }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <TeamMonogram
                abbr={team.abbr}
                colors={team.colors}
                className="h-7 min-w-[34px] text-[12px]"
              />
              <p className="label">
                {league.toUpperCase()} · {team.conference} {team.division}
              </p>
            </div>
            <h1 className="mt-3 text-4xl">{team.name}</h1>
            <p className="text-text-dim mt-2 text-[14px]">{team.city}</p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <FollowButton
              teamId={team.id}
              nextPath={`/${league}/${team.slug}`}
              size="default"
            />
            <Link
              href="/alerts"
              className="text-text-dim hover:text-volt font-mono text-[11px] tracking-[0.1em] uppercase"
            >
              <Bell size={12} className="mr-1 inline" />
              Manage alerts
            </Link>
          </div>
        </div>

        <dl className="border-line mt-6 grid grid-cols-2 gap-px border-t pt-4 sm:grid-cols-3">
          <Stat
            label="Next game"
            value={nextGame ? formatKickoff(nextGame.game.startsAt) : "—"}
          />
          <Stat
            label="Cheapest all-in"
            value={nextGame?.bestAllIn != null ? formatCents(nextGame.bestAllIn) : "—"}
            note={nextGame?.bestIsEstimate ? "est." : undefined}
          />
          <Stat
            label="Lowest tracked"
            value={lowest !== null ? formatCents(lowest) : "—"}
          />
        </dl>
      </header>

      <section>
        <div className="border-line mb-4 flex flex-wrap items-end justify-between gap-3 border-b pb-3">
          <h2 className="text-2xl">Schedule</h2>
          <span className="label">
            {schedule.length} upcoming · all-in · refreshed every 15m
          </span>
        </div>

        {schedule.length === 0 ? (
          <div className="border-line bg-surface rounded-md border p-6">
            <p className="text-text text-[14px]">No upcoming games on the board.</p>
            <p className="text-text-dim mt-2 text-[13px]">
              Schedules come from provider event searches. Follow the team and we will
              alert you as soon as games are listed.
            </p>
          </div>
        ) : (
          <div className="border-line bg-surface overflow-x-auto border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Opponent</TableHead>
                  <TableHead className="hidden md:table-cell">Venue</TableHead>
                  <TableHead numeric>Cheapest all-in</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead numeric className="hidden sm:table-cell">
                    7d
                  </TableHead>
                  <TableHead className="text-right">Deal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((game) => {
                  const view = views.get(game.id);
                  const isHome = game.homeTeamId === team.id;
                  const opponent = isHome ? game.awayTeam : game.homeTeam;
                  const provider = view?.bestProviderId
                    ? getProvider(view.bestProviderId)
                    : null;

                  return (
                    <TableRow key={game.id}>
                      <TableCell className="font-mono text-[12px] whitespace-nowrap">
                        {formatKickoff(game.startsAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-text-dim font-mono text-[12px]">
                            {isHome ? "vs" : "@"}
                          </span>
                          <TeamMonogram abbr={opponent.abbr} colors={opponent.colors} />
                          <span className="text-[13px]">{opponent.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-text-dim hidden md:table-cell">
                        {game.venue?.name ?? "—"}
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
                      <TableCell>
                        {provider ? (
                          <Badge variant="neutral">{provider.name}</Badge>
                        ) : (
                          <span className="text-text-dim">—</span>
                        )}
                      </TableCell>
                      <TableCell numeric className="hidden sm:table-cell">
                        {view ? <TrendArrow trend={view.trend7d} /> : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/game/${game.slug}`}
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
      </section>

      <p className="text-text-dim text-[12px]">
        FanTicket Hub is not affiliated with the {league === "nfl" ? "NFL" : "NBA"} or
        any team. We may earn a commission on purchases made through our links.
      </p>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="px-0 py-2 sm:px-4">
      <dt className="label">{label}</dt>
      <dd className="mt-2 font-mono text-[16px] tabular-nums">
        {value}
        {note ? <span className="text-text-dim ml-1 text-[12px]">{note}</span> : null}
      </dd>
    </div>
  );
}
