import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import type { TeamColors } from "@/lib/types";
import { formatCents } from "@/lib/utils";

const TOKENS = [
  { name: "--ink", hex: "#0B0C0E" },
  { name: "--surface", hex: "#121417" },
  { name: "--surface-2", hex: "#17191D" },
  { name: "--line", hex: "#23262B" },
  { name: "--line-soft", hex: "#1A1C20" },
  { name: "--text", hex: "#F2F3F5" },
  { name: "--text-dim", hex: "#9BA1A9" },
  { name: "--volt", hex: "#C8FF3D" },
  { name: "--volt-press", hex: "#A8DC2A" },
  { name: "--amber", hex: "#FFB224" },
  { name: "--red", hex: "#FF5C5C" },
];

interface DemoTeam {
  abbr: string;
  colors: TeamColors;
}

interface DropRow {
  id: string;
  league: string;
  away: DemoTeam;
  home: DemoTeam;
  venue: string;
  allIn: number;
  prev: number;
  provider: string;
  est?: boolean;
}

const DROPS: DropRow[] = [
  {
    id: "d1",
    league: "NBA",
    away: { abbr: "LAL", colors: { primary: "#552583", secondary: "#FDB927" } },
    home: { abbr: "BOS", colors: { primary: "#007A33", secondary: "#BA9653" } },
    venue: "TD Garden",
    allIn: 5800,
    prev: 7100,
    provider: "SeatGeek",
  },
  {
    id: "d2",
    league: "NFL",
    away: { abbr: "CHI", colors: { primary: "#0B162A", secondary: "#C83803" } },
    home: { abbr: "GB", colors: { primary: "#203731", secondary: "#FFB612" } },
    venue: "Lambeau Field",
    allIn: 11800,
    prev: 13400,
    provider: "Ticketmaster",
    est: true,
  },
  {
    id: "d3",
    league: "NBA",
    away: { abbr: "BKN", colors: { primary: "#000000", secondary: "#FFFFFF" } },
    home: { abbr: "TOR", colors: { primary: "#CE1141", secondary: "#000000" } },
    venue: "Scotiabank Arena",
    allIn: 4200,
    prev: 6100,
    provider: "SeatGeek",
  },
  {
    id: "d4",
    league: "NFL",
    away: { abbr: "DAL", colors: { primary: "#003594", secondary: "#869397" } },
    home: { abbr: "PHI", colors: { primary: "#004C54", secondary: "#A5ACAF" } },
    venue: "Lincoln Financial Field",
    allIn: 14300,
    prev: 18800,
    provider: "TickPick",
    est: true,
  },
];

const STATS = [
  { label: "Providers", value: "6" },
  { label: "Avg. saved", value: "23%" },
  { label: "Sync interval", value: "15m" },
  { label: "Fees", value: "All-in" },
];

export default function HomePage() {
  return (
    <div className="space-y-14">
      {/* Hero ---------------------------------------------------------------- */}
      <section className="border-b border-line pb-12">
        <p className="label">NFL · NBA · all-in pricing</p>
        <h1 className="mt-4 max-w-3xl text-5xl sm:text-6xl">
          Every seat. Every price.
          <br />
          One board.
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-text-dim">
          We watch SeatGeek, Ticketmaster, StubHub and the rest — then show you
          the cheapest all-in price per game. Set a number. We tell you the
          moment it clears.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/register" className={buttonVariants({ size: "lg" })}>
            <Search size={15} strokeWidth={2.25} />
            Find tickets for your team
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Stat strip ---------------------------------------------------------- */}
      <section>
        <dl className="grid grid-cols-2 border border-line md:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="border-r border-b border-line px-5 py-5 last:border-r-0 md:border-b-0"
            >
              <dt className="label">{stat.label}</dt>
              <dd className="mt-2 font-mono text-2xl tabular-nums">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Sample drops table -------------------------------------------------- */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
          <h2 className="text-2xl">Biggest drops right now</h2>
          <span className="label">last 24h · est. all-in</span>
        </div>

        <div className="overflow-x-auto border border-line bg-surface">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Game</TableHead>
                <TableHead className="hidden sm:table-cell">Venue</TableHead>
                <TableHead numeric>All-in</TableHead>
                <TableHead numeric className="hidden sm:table-cell">
                  7d
                </TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Deal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DROPS.map((row) => {
                const pct = Math.round(
                  ((row.allIn - row.prev) / row.prev) * 100,
                );
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <TeamMonogram
                          abbr={row.away.abbr}
                          colors={row.away.colors}
                        />
                        <span className="font-mono text-[12px] text-text-dim">
                          @
                        </span>
                        <TeamMonogram
                          abbr={row.home.abbr}
                          colors={row.home.colors}
                        />
                        <span className="ml-1 font-display text-[15px] tracking-tight">
                          {row.away.abbr}–{row.home.abbr}
                        </span>
                        <Badge variant="outline">{row.league}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-text-dim sm:table-cell">
                      {row.venue}
                    </TableCell>
                    <TableCell numeric>
                      {formatCents(row.allIn)}
                      {row.est && (
                        <span className="ml-1 text-text-dim">est.</span>
                      )}
                    </TableCell>
                    <TableCell numeric className="hidden sm:table-cell">
                      <span className="inline-flex items-center justify-end gap-1 text-volt">
                        <ArrowDownRight size={13} />
                        {pct}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{row.provider}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={buttonVariants({
                          variant: "secondary",
                          size: "sm",
                        })}
                      >
                        View
                        <ArrowUpRight size={13} />
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <p className="mt-3 flex items-center gap-2 text-[12px] text-text-dim">
          <ShieldCheck size={14} className="text-volt" />
          Estimates marked <span className="text-text">“est.”</span> — all-in
          totals, fees included, per FTC junk-fee guidance.
        </p>
      </section>

      {/* Design tokens ------------------------------------------------------- */}
      <section className="border-t border-line pt-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl">Design tokens</h2>
            <p className="label mt-2">
              roadmap §4 — volt is the only accent
            </p>
          </div>
          <span className="label">dark-first · borders not shadows</span>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Palette */}
          <Card>
            <CardHeader>
              <CardTitle>Palette</CardTitle>
              <span className="label">CSS vars</span>
            </CardHeader>
            <CardBody>
              <ul className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
                {TOKENS.map((token) => (
                  <li
                    key={token.name}
                    className="flex items-center gap-3 bg-surface px-3 py-2"
                  >
                    <span
                      className="h-5 w-5 shrink-0 rounded-[3px] border border-line"
                      style={{ background: token.hex }}
                    />
                    <span className="font-mono text-[11px] text-text-dim">
                      {token.name}
                    </span>
                    <span className="ml-auto font-mono text-[11px] tabular-nums">
                      {token.hex}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle>Type</CardTitle>
              <span className="label">3 families</span>
            </CardHeader>
            <CardBody className="space-y-5">
              <div>
                <p className="label mb-2">Barlow Condensed · 700</p>
                <p className="font-display text-4xl tracking-tight uppercase">
                  Cheapest since Dec 12
                </p>
              </div>
              <div>
                <p className="label mb-2">Archivo · 400/500</p>
                <p className="text-[15px] text-text-dim">
                  Body and UI text stays plain and readable at 14–15px. No
                  marketing fluff, no emoji.
                </p>
              </div>
              <div>
                <p className="label mb-2">JetBrains Mono · tabular</p>
                <p className="font-mono text-2xl tabular-nums">
                  $58.00 <span className="text-volt">▼ 18%</span>
                </p>
              </div>
            </CardBody>
          </Card>

          {/* Buttons & badges */}
          <Card>
            <CardHeader>
              <CardTitle>Controls</CardTitle>
              <span className="label">4px radius</span>
            </CardHeader>
            <CardBody className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm">Small</Button>
                <Button size="sm" disabled>
                  Disabled
                </Button>
                <Button variant="secondary" size="sm">
                  <Bell size={13} />
                  Alert me
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
                <Badge variant="volt">Best deal</Badge>
                <Badge variant="amber">Rising</Badge>
                <Badge variant="red">Sold out</Badge>
                <Badge variant="neutral">est.</Badge>
                <Badge variant="outline">NBA</Badge>
              </div>
            </CardBody>
          </Card>

          {/* Dense table */}
          <Card>
            <CardHeader>
              <CardTitle>Dense table</CardTitle>
              <span className="label">40px rows</span>
            </CardHeader>
            <CardBody className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Provider</TableHead>
                    <TableHead numeric>All-in</TableHead>
                    <TableHead numeric>Listings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="flex items-center gap-2">
                      SeatGeek
                      <Badge variant="volt">Best deal</Badge>
                    </TableCell>
                    <TableCell numeric>{formatCents(5800)}</TableCell>
                    <TableCell numeric>1,204</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Ticketmaster</TableCell>
                    <TableCell numeric>{formatCents(6420)}</TableCell>
                    <TableCell numeric>864</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>StubHub</TableCell>
                    <TableCell numeric className="text-text-dim">
                      —
                    </TableCell>
                    <TableCell numeric className="text-text-dim">
                      —
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        </div>
      </section>
    </div>
  );
}
