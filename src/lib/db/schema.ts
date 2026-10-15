import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { TeamColors } from "@/lib/types";

/* ─────────────────────────────────────────────────────────────────────────────
 * Auth tables (better-auth).
 *
 * The TS property names MUST match better-auth's field names (camelCase) — the
 * adapter looks columns up by property name. The quoted DB column names are
 * snake_case, matching better-auth's own Drizzle schema generator.
 * ──────────────────────────────────────────────────────────────────────────── */

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  /** Domain field (roadmap §6): "free" | "premium". */
  plan: text("plan", { enum: ["free", "premium"] }).default("free").notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

/* ─────────────────────────────────────────────────────────────────────────────
 * Domain tables (roadmap §6)
 * ──────────────────────────────────────────────────────────────────────────── */

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    league: text("league", { enum: ["nfl", "nba"] }).notNull(),
    city: text("city").notNull(),
    name: text("name").notNull(),
    abbr: text("abbr").notNull(),
    conference: text("conference").notNull(),
    division: text("division").notNull(),
    colors: jsonb("colors").$type<TeamColors>().notNull(),
    seatgeekSlug: text("seatgeek_slug").notNull(),
    tmAttractionId: text("tm_attraction_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("teams_league_abbr_uq").on(table.league, table.abbr)],
);

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  // deeplink / API identifiers are nullable until synced — never guessed.
  seatgeekVenueId: text("seatgeek_venue_id"),
});

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    league: text("league", { enum: ["nfl", "nba"] }).notNull(),
    homeTeamId: uuid("home_team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    awayTeamId: uuid("away_team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    venueId: uuid("venue_id").references(() => venues.id, {
      onDelete: "set null",
    }),
    startsAt: timestamp("starts_at").notNull(),
    status: text("status", {
      enum: ["scheduled", "onsale", "sold_out", "cancelled", "final"],
    })
      .default("scheduled")
      .notNull(),
    seatgeekEventId: text("seatgeek_event_id"),
    ticketmasterId: text("ticketmaster_id"),
  },
  (table) => [index("games_starts_at_idx").on(table.startsAt)],
);

export const follows = pgTable(
  "follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("follows_user_team_uq").on(table.userId, table.teamId),
  ],
);

export const trackedGames = pgTable(
  "tracked_games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    thresholdCents: integer("threshold_cents"),
    onPriceDrop: boolean("on_price_drop").default(true).notNull(),
    onNewTickets: boolean("on_new_tickets").default(true).notNull(),
    pctDropThreshold: integer("pct_drop_threshold"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("tracked_games_user_id_idx").on(table.userId)],
);

/** Append-only — this table IS the price history (roadmap §6). */
export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull(),
    minCents: integer("min_cents"),
    maxCents: integer("max_cents"),
    allInMinCents: integer("all_in_min_cents"),
    listingCount: integer("listing_count"),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => [
    index("price_snapshots_game_fetched_idx").on(table.gameId, table.fetchedAt),
  ],
);

export const alertEvents = pgTable(
  "alert_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: uuid("game_id").references(() => games.id, {
      onDelete: "cascade",
    }),
    type: text("type", {
      enum: ["price_drop", "threshold", "new_tickets", "low_ever"],
    }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    channel: text("channel", { enum: ["email", "push", "sms"] }).notNull(),
    sentAt: timestamp("sent_at"),
    dedupeKey: text("dedupe_key").notNull(),
  },
  (table) => [
    uniqueIndex("alert_events_dedupe_key_uq").on(table.dedupeKey),
  ],
);

export const pushSubs = pgTable("push_subs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").references(() => games.id, {
    onDelete: "set null",
  }),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const syncLog = pgTable("sync_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  job: text("job").notNull(),
  providerId: text("provider_id"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  status: text("status", { enum: ["running", "ok", "error"] })
    .default("running")
    .notNull(),
  rowCount: integer("row_count").default(0).notNull(),
  error: text("error"),
});
