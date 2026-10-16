import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BellOff } from "lucide-react";

import { FollowButton } from "@/components/domain/follow-button";
import { UntrackButton } from "@/components/domain/untrack-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamMonogram } from "@/components/ui/monogram";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auth } from "@/lib/auth";
import {
  getUserAlertHistory,
  getUserFollows,
  getUserTrackedGames,
  getUpcomingGames,
} from "@/lib/db/queries";
import { matchupLong } from "@/lib/games";
import { anyInventoryProviderMocked } from "@/lib/providers";
import { formatCents, formatKickoff } from "@/lib/utils";
import { buildViews } from "@/lib/views";

export const metadata: Metadata = { title: "Alerts" };

// Session, follows and snapshots are all per-request.
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  price_drop: "Price drop",
  threshold: "Threshold",
  new_tickets: "New tickets",
  low_ever: "Lowest ever",
};

export default async function AlertsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/alerts");

  const userId = session.user.id;
  const [follows, tracked, history, upcoming] = await Promise.all([
    getUserFollows(userId),
    getUserTrackedGames(userId),
    getUserAlertHistory(userId, 20),
    getUpcomingGames({ limit: 300 }),
  ]);

  const followedTeamIds = new Set(follows.map((follow) => follow.teamId));
  const followedGames = upcoming.filter(
    (game) =>
      followedTeamIds.has(game.homeTeamId) || followedTeamIds.has(game.awayTeamId),
  );

  const byId = new Map<string, (typeof upcoming)[number]>();
  for (const game of [...tracked.map((row) => row.game), ...followedGames]) {
    byId.set(game.id, game);
  }
  const views = await buildViews([...byId.values()]);
  const mocked = anyInventoryProviderMocked();

  return (
    <div className="space-y-10">
      <header className="border-line flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="label">Signed in · {session.user.email}</p>
          <h1 className="mt-3 text-4xl">Your alerts board</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="neutral">
            {(session.user as { plan?: string }).plan ?? "free"} plan
          </Badge>
          <Link
            href="/pricing"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Plans
          </Link>
        </div>
      </header>

      {mocked ? (
        <p className="border-line bg-surface-2 text-text-dim rounded-sm border px-3 py-2 font-mono text-[11px]">
          MOCK MODE — inventory providers are serving fixture data. Prices here are demo
          values, never live market prices.
        </p>
      ) : null}

      {/* Follows ------------------------------------------------------------- */}
      <section>
        <div className="border-line mb-4 flex items-end justify-between gap-3 border-b pb-3">
          <h2 className="text-2xl">Teams you follow</h2>
          <span className="label">{follows.length} teams</span>
        </div>

        {follows.length === 0 ? (
          <Empty
            title="No teams followed yet"
            body="Follow a team and we will watch every game on its schedule."
            href="/nfl"
            cta="Browse NFL teams"
          />
        ) : (
          <div className="border-line bg-surface overflow-x-auto border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Team</TableHead>
                  <TableHead className="hidden sm:table-cell">Next game</TableHead>
                  <TableHead numeric>Cheapest all-in</TableHead>
                  <TableHead className="text-right">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {follows.map((follow) => {
                  const nextGame = followedGames.find(
                    (game) =>
                      game.homeTeamId === follow.teamId ||
                      game.awayTeamId === follow.teamId,
                  );
                  const view = nextGame ? views.get(nextGame.id) : undefined;
                  return (
                    <TableRow key={follow.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <TeamMonogram
                            abbr={follow.team.abbr}
                            colors={follow.team.colors}
                          />
                          <Link
                            href={`/${follow.team.league}/${follow.team.slug}`}
                            className="hover:text-volt text-[13px] transition-colors duration-150"
                          >
                            {follow.team.name}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="text-text-dim hidden sm:table-cell">
                        {view ? (
                          <span className="font-mono text-[12px]">
                            {matchupLong(view.game)} ·{" "}
                            {formatKickoff(view.game.startsAt)}
                          </span>
                        ) : (
                          "No games scheduled"
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
                      <TableCell className="text-right">
                        <FollowButton teamId={follow.teamId} nextPath="/alerts" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Tracked games ------------------------------------------------------- */}
      <section>
        <div className="border-line mb-4 flex items-end justify-between gap-3 border-b pb-3">
          <h2 className="text-2xl">Games you track</h2>
          <span className="label">{tracked.length} games</span>
        </div>

        {tracked.length === 0 ? (
          <Empty
            title="No per-game alerts yet"
            body="Open a game and set a dollar threshold — we email you the moment the all-in price clears it."
            href="/nba"
            cta="Browse NBA games"
          />
        ) : (
          <div className="border-line bg-surface overflow-x-auto border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Game</TableHead>
                  <TableHead className="hidden md:table-cell">Kickoff</TableHead>
                  <TableHead numeric>Cheapest all-in</TableHead>
                  <TableHead>Triggers</TableHead>
                  <TableHead className="text-right">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tracked.map((row) => {
                  const view = views.get(row.gameId);
                  const triggers = [
                    row.thresholdCents !== null
                      ? `under ${formatCents(row.thresholdCents)}`
                      : null,
                    row.onPriceDrop ? `drop ≥ ${row.pctDropThreshold ?? 10}%` : null,
                    row.onNewTickets ? "new tickets" : null,
                  ].filter(Boolean);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link
                          href={`/game/${row.game.slug}`}
                          className="hover:text-volt text-[13px] transition-colors duration-150"
                        >
                          {matchupLong(row.game)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-text-dim hidden font-mono text-[12px] md:table-cell">
                        {formatKickoff(row.game.startsAt)}
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
                        <span className="text-text-dim font-mono text-[11px]">
                          {triggers.join(" · ") || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/game/${row.game.slug}`}
                            className={buttonVariants({
                              variant: "secondary",
                              size: "sm",
                            })}
                          >
                            Edit
                            <ArrowUpRight size={13} />
                          </Link>
                          <UntrackButton gameId={row.gameId} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* History ------------------------------------------------------------- */}
      <section>
        <div className="border-line mb-4 flex items-end justify-between gap-3 border-b pb-3">
          <h2 className="text-2xl">Alert history</h2>
          <span className="label">last {history.length}</span>
        </div>

        {history.length === 0 ? (
          <Empty
            title="No alerts sent yet"
            body="When a price clears your threshold we record it here — and email you."
            href="/alerts"
            cta="Refresh"
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Sent alerts</CardTitle>
              <BellOff size={14} className="text-text-dim" aria-hidden />
            </CardHeader>
            <CardBody className="p-0">
              <ul>
                {history.map((event) => {
                  const payload = event.payload as {
                    matchup?: string;
                    allInCents?: number;
                    previousCents?: number | null;
                    providerId?: string;
                  };
                  return (
                    <li
                      key={event.id}
                      className="border-line-soft flex flex-wrap items-center gap-2 border-b px-4 py-3 last:border-0"
                    >
                      <Badge variant={event.type === "price_drop" ? "volt" : "neutral"}>
                        {TYPE_LABEL[event.type] ?? event.type}
                      </Badge>
                      <span className="text-[13px]">
                        {payload.matchup ??
                          (event.game ? matchupLong(event.game) : "Game")}
                      </span>
                      <span className="text-text-dim ml-auto font-mono text-[12px] tabular-nums">
                        {payload.previousCents !== undefined &&
                        payload.previousCents !== null ? (
                          <span className="text-text-dim mr-2 line-through">
                            {formatCents(payload.previousCents)}
                          </span>
                        ) : null}
                        {payload.allInCents !== undefined
                          ? formatCents(payload.allInCents)
                          : ""}
                      </span>
                      <span className="text-text-dim font-mono text-[11px]">
                        {event.sentAt
                          ? new Date(event.sentAt)
                              .toISOString()
                              .slice(0, 16)
                              .replace("T", " ")
                          : "queued"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        )}
      </section>
    </div>
  );
}

function Empty({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="border-line bg-surface rounded-md border p-6">
      <p className="text-text text-[14px]">{title}</p>
      <p className="text-text-dim mt-2 max-w-lg text-[13px]">{body}</p>
      <Link
        href={href}
        className={buttonVariants({
          variant: "secondary",
          size: "sm",
          className: "mt-4",
        })}
      >
        {cta}
      </Link>
    </div>
  );
}
