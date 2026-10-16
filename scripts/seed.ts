/**
 * Phase 0 seed — `pnpm db:seed`
 *
 * 1. Validates + upserts all 62 teams from teams.json
 * 2. Resets fixture venues + games (8 teams/sport, 2 weeks of games)
 * 3. Writes provider Mock-Mode fixtures to src/lib/fixtures/*.json
 *
 * Mock fixtures are tagged `isMock: true` and must never be rendered as real.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { teamsSchema, type Team } from "../src/lib/teams";

const NFL_SUBSET = [
  "chicago-bears",
  "green-bay-packers",
  "dallas-cowboys",
  "philadelphia-eagles",
  "kansas-city-chiefs",
  "buffalo-bills",
  "san-francisco-49ers",
  "pittsburgh-steelers",
] as const;

const NBA_SUBSET = [
  "los-angeles-lakers",
  "boston-celtics",
  "new-york-knicks",
  "golden-state-warriors",
  "denver-nuggets",
  "milwaukee-bucks",
  "miami-heat",
  "dallas-mavericks",
] as const;

/** Curated venue names for the 16 fixture host teams (teams.json has no venue). */
const VENUES: Record<string, { name: string; city: string }> = {
  "chicago-bears": { name: "Soldier Field", city: "Chicago" },
  "green-bay-packers": { name: "Lambeau Field", city: "Green Bay" },
  "dallas-cowboys": { name: "AT&T Stadium", city: "Arlington" },
  "philadelphia-eagles": {
    name: "Lincoln Financial Field",
    city: "Philadelphia",
  },
  "kansas-city-chiefs": { name: "Arrowhead Stadium", city: "Kansas City" },
  "buffalo-bills": { name: "Highmark Stadium", city: "Orchard Park" },
  "san-francisco-49ers": { name: "Levi's Stadium", city: "Santa Clara" },
  "pittsburgh-steelers": { name: "Acrisure Stadium", city: "Pittsburgh" },
  "los-angeles-lakers": { name: "Crypto.com Arena", city: "Los Angeles" },
  "boston-celtics": { name: "TD Garden", city: "Boston" },
  "new-york-knicks": { name: "Madison Square Garden", city: "New York" },
  "golden-state-warriors": { name: "Chase Center", city: "San Francisco" },
  "denver-nuggets": { name: "Ball Arena", city: "Denver" },
  "milwaukee-bucks": { name: "Fiserv Forum", city: "Milwaukee" },
  "miami-heat": { name: "Kaseya Center", city: "Miami" },
  "dallas-mavericks": { name: "American Airlines Center", city: "Dallas" },
};

const INVENTORY_PROVIDERS = ["seatgeek", "ticketmaster"] as const;
const DEEPLINK_PROVIDERS = ["stubhub", "vividseats", "tickpick", "gametime"] as const;

/* ── deterministic PRNG ──────────────────────────────────────────────────── */

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── schedule helpers ────────────────────────────────────────────────────── */

/** Circle-method pairings so every round has distinct matchups. */
function roundPairs<T>(teams: readonly T[], round: number): Array<[T, T]> {
  const n = teams.length;
  const rest = teams.slice(1);
  const shift = round % (n - 1);
  const rotated = [...rest.slice(shift), ...rest.slice(0, shift)];
  const order = [teams[0], ...rotated];
  const pairs: Array<[T, T]> = [];
  for (let i = 0; i < n / 2; i++) {
    pairs.push([order[i], order[n - 1 - i]]);
  }
  return pairs;
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/* ── main ────────────────────────────────────────────────────────────────── */

async function main() {
  const { sql } = await import("drizzle-orm");
  const { db } = await import("../src/lib/db");
  const schema = await import("../src/lib/db/schema");
  const { gameSlug } = await import("../src/lib/teams");

  console.log("→ Reading teams.json …");
  const raw = await readFile(path.join(process.cwd(), "teams.json"), "utf8");
  const teams = teamsSchema.parse(JSON.parse(raw));
  console.log(
    `  ${teams.length} teams (${teams.filter((t) => t.league === "nfl").length} NFL, ${
      teams.filter((t) => t.league === "nba").length
    } NBA)`,
  );

  /* 1. teams — upsert so user follows survive a re-seed */
  console.log("→ Upserting teams …");
  await db
    .insert(schema.teams)
    .values(
      teams.map((team) => ({
        slug: team.slug,
        league: team.league,
        city: team.city,
        name: team.name,
        abbr: team.abbr,
        conference: team.conference,
        division: team.division,
        colors: team.colors,
        seatgeekSlug: team.seatgeekSlug,
        tmAttractionId: team.tmAttractionId,
      })),
    )
    .onConflictDoUpdate({
      target: schema.teams.slug,
      set: {
        league: sql`excluded.league`,
        city: sql`excluded.city`,
        name: sql`excluded.name`,
        abbr: sql`excluded.abbr`,
        conference: sql`excluded.conference`,
        division: sql`excluded.division`,
        colors: sql`excluded.colors`,
        seatgeekSlug: sql`excluded.seatgeek_slug`,
        tmAttractionId: sql`excluded.tm_attraction_id`,
      },
    });

  /* 2. reset fixture games + venues */
  console.log("→ Resetting fixture games & venues …");
  await db.delete(schema.games);
  await db.delete(schema.venues);

  const bySlug = new Map(teams.map((team) => [team.slug, team]));
  const teamIdBySlug = new Map<string, string>();
  for (const row of await db
    .select({ id: schema.teams.id, slug: schema.teams.slug })
    .from(schema.teams)) {
    teamIdBySlug.set(row.slug, row.id);
  }

  function resolve(slug: string): Team & { id: string } {
    const team = bySlug.get(slug);
    const id = teamIdBySlug.get(slug);
    if (!team || !id) {
      throw new Error(`Fixture team "${slug}" missing from teams.json / DB`);
    }
    return { ...team, id };
  }

  const subset = [...NFL_SUBSET, ...NBA_SUBSET].map(resolve);

  const insertedVenues = await db
    .insert(schema.venues)
    .values(
      subset.map((team) => ({
        name:
          VENUES[team.slug]?.name ??
          `${team.city} ${team.league === "nfl" ? "Stadium" : "Arena"}`,
        city: VENUES[team.slug]?.city ?? team.city,
        seatgeekVenueId: null,
      })),
    )
    .returning({ id: schema.venues.id });
  const venueIdByTeam = new Map(
    subset.map((team, index) => [team.slug, insertedVenues[index].id]),
  );

  console.log("→ Building 2 weeks of games …");
  const base = startOfTodayUtc();
  const gameRows: Array<typeof schema.games.$inferInsert> = [];
  const generatedSlugs: string[] = [];

  function addLeagueGames(
    league: "nfl" | "nba",
    slugs: readonly string[],
    dayOffsets: number[],
    hourUtc: number,
  ) {
    const leagueTeams = slugs.map(resolve);
    dayOffsets.forEach((offset, round) => {
      roundPairs(leagueTeams, round).forEach(([a, b], pairIndex) => {
        // Alternate home/away so every team hosts games.
        const [home, away] = (round + pairIndex) % 2 === 0 ? [a, b] : [b, a];
        const startsAt = new Date(
          base.getTime() + offset * 86_400_000 + hourUtc * 3_600_000,
        );
        const slug = gameSlug(league, away.slug, home.slug, startsAt);
        generatedSlugs.push(slug);
        gameRows.push({
          slug,
          league,
          homeTeamId: home.id,
          awayTeamId: away.id,
          venueId: venueIdByTeam.get(home.slug) ?? null,
          startsAt,
          status: "onsale",
          seatgeekEventId: `mock-sg-${hashString(slug).toString(16)}`,
          ticketmasterId: null,
        });
      });
    });
  }

  // NFL: one game per week (2 rounds). NBA: 6 dates across the fortnight.
  addLeagueGames("nfl", NFL_SUBSET, [3, 10], 18);
  addLeagueGames("nba", NBA_SUBSET, [1, 3, 5, 7, 9, 12], 23);

  await db.insert(schema.games).values(gameRows);
  console.log(`  ${gameRows.length} games inserted`);

  /* 3. provider fixtures */
  console.log("→ Writing provider fixtures …");
  const fixturesDir = path.join(process.cwd(), "src/lib/fixtures");
  await mkdir(fixturesDir, { recursive: true });
  const generatedAt = new Date().toISOString();

  for (const providerId of INVENTORY_PROVIDERS) {
    const quotes: Record<string, unknown> = {};
    for (const slug of generatedSlugs) {
      const rng = mulberry32(hashString(`${providerId}:${slug}`));
      const baseCents = 4_000 + Math.floor(rng() * 14_000);
      // Neither SeatGeek nor Ticketmaster documents fee-inclusive prices, so
      // every fixture total carries the §5 20% estimate (allInIsEstimate: true).
      const feesCents = Math.round(baseCents * 0.2);
      quotes[slug] = {
        providerId,
        minPriceCents: baseCents,
        feesCents,
        allInCents: baseCents + feesCents,
        allInIsEstimate: true,
        listingCount: 40 + Math.floor(rng() * 1_600),
        url: `https://mock.fantickethub.local/${providerId}/${slug}`,
        fetchedAt: generatedAt,
      };
    }
    await writeFile(
      path.join(fixturesDir, `${providerId}.json`),
      JSON.stringify(
        {
          providerId,
          type: "inventory",
          isMock: true,
          note: "MOCK FIXTURE — never presented as real data.",
          generatedAt,
          quotes,
        },
        null,
        2,
      ) + "\n",
    );
  }

  for (const providerId of DEEPLINK_PROVIDERS) {
    const links: Record<string, string> = {};
    for (const slug of generatedSlugs) {
      links[slug] = `https://mock.fantickethub.local/${providerId}/${slug}`;
    }
    await writeFile(
      path.join(fixturesDir, `${providerId}.json`),
      JSON.stringify(
        {
          providerId,
          type: "deeplink",
          isMock: true,
          note: "MOCK FIXTURE — deeplink only, no prices.",
          generatedAt,
          links,
        },
        null,
        2,
      ) + "\n",
    );
  }
  console.log(
    `  ${INVENTORY_PROVIDERS.length + DEEPLINK_PROVIDERS.length} fixture files written`,
  );

  /* 4. provider slug verification (only meaningful with a SeatGeek key) */
  if (process.env.SEATGEEK_CLIENT_ID) {
    console.log(
      "→ SeatGeek slug verification: key present — real check lands in Phase 1.",
    );
  } else {
    console.log(
      "→ SeatGeek slug verification skipped (no SEATGEEK_CLIENT_ID). See README.",
    );
  }

  const nullTm = teams.filter((team) => team.tmAttractionId === null).length;
  console.log(
    `→ tmAttractionId null for ${nullTm}/${teams.length} teams — UI hides the Ticketmaster badge (never guessed).`,
  );

  console.log("\n✔ Seed complete.");
}

main().catch((error) => {
  console.error("✖ Seed failed:", error);
  process.exit(1);
});
